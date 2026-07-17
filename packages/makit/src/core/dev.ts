import { spawn } from "node:child_process";
import { cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import chokidar from "chokidar";
import type { ResolvedConfig } from "../types/resolved-config.js";
import { loadConfig } from "../config/load.js";
import { createMetadataJiti } from "../metadata/loader.js";
import { generateApp } from "./app-generator/index.js";
import { MetadataCache } from "./cache.js";
import { synthesizeCollectionTopPages } from "./collection-top.js";
import type { ResolvedCollection } from "./collections.js";
import { resolveCollections } from "./collections.js";
import { writeGeneratedData } from "./generate.js";
import { generateFallbackPages, populateAlternates } from "./i18n.js";
import { resolvePackageRoot } from "./link-runtime-deps.js";
import type { Logger } from "./logger.js";
import { decoratePagesWithNavigation } from "./nav-decorate.js";
import { generateAllNavigation } from "./navigation.js";
import { buildAllPages } from "./pages.js";

export interface DevOptions {
  port: number;
  host: string;
  silent?: boolean;
}

export interface DevServer {
  close: () => Promise<void>;
}

/** Every `.makit.ts`/`.meta.ts` file and its local import dependencies (spec §19, §43). */
function collectMetadataWatchPaths(
  collections: readonly ResolvedCollection[],
  pageMetadataPaths: readonly string[],
  navMetadataPaths: readonly string[],
): string[] {
  const paths = new Set<string>();
  for (const collection of collections) {
    for (const locale of Object.values(collection.locales)) {
      if (locale.metadataPath) paths.add(locale.metadataPath);
      for (const dependency of locale.dependencies) paths.add(dependency);
    }
  }
  for (const path of pageMetadataPaths) paths.add(path);
  for (const path of navMetadataPaths) paths.add(path);
  return [...paths];
}

async function regenerateContent(config: ResolvedConfig, logger: Logger): Promise<string[]> {
  // A fresh jiti per regeneration so edited metadata files re-evaluate; the
  // metadata cache is disk-backed and content-addressed (spec §22), so
  // recreating the handle here is cheap and still lets unchanged files
  // across the whole dev session skip re-evaluation.
  const jiti = createMetadataJiti();
  const metadataCache = await MetadataCache.create(config);
  const {
    collections,
    warnings: collectionWarnings,
    diagnostics: collectionDiagnostics,
  } = await resolveCollections(config, jiti, metadataCache);
  // Unlike `makit build`, dev keeps draft pages visible (spec §16).
  const {
    pages,
    warnings,
    diagnostics: pageDiagnostics,
    metadataPaths: pageMetadataPaths,
  } = await buildAllPages(config, collections, { metadataCache });
  const fallbackPages = generateFallbackPages(pages, config);
  const collectionTopPages = synthesizeCollectionTopPages(
    [...pages, ...fallbackPages],
    config,
    collections,
  );
  const undecoratedPages = populateAlternates(
    [...pages, ...fallbackPages, ...collectionTopPages],
    config,
  );
  const {
    byLocale,
    diagnostics: navigationMetadataDiagnostics,
    metadataPaths: navMetadataPaths,
  } = await generateAllNavigation(undecoratedPages, config, collections, jiti, metadataCache);
  const { pages: allPages } = decoratePagesWithNavigation(
    undecoratedPages,
    byLocale,
    config,
    collections,
  );
  await writeGeneratedData(config, allPages, collections, byLocale);
  for (const warning of [...collectionWarnings, ...warnings]) logger.warn(warning);
  for (const diagnostic of [
    ...collectionDiagnostics,
    ...pageDiagnostics,
    ...navigationMetadataDiagnostics,
  ]) {
    logger.warn(
      diagnostic.sourcePath
        ? `${diagnostic.sourcePath}: ${diagnostic.message}`
        : diagnostic.message,
      diagnostic.code,
    );
  }
  logger.success(`Regenerated ${allPages.length} page(s)`);

  return collectMetadataWatchPaths(collections, pageMetadataPaths, navMetadataPaths);
}

/** Starts `next dev` over `.makit/app`, watching sources and regenerating on change (spec §9.3, §43). */
export async function startDevServer(
  initialConfig: ResolvedConfig,
  options: DevOptions,
  logger: Logger,
): Promise<DevServer> {
  let config = initialConfig;
  const makitDir = join(config.root, ".makit");

  await generateApp(config);
  let metadataWatchPaths = await regenerateContent(config, logger);

  let sourceWatcher: ReturnType<typeof chokidar.watch> | undefined;
  let metadataWatcher: ReturnType<typeof chokidar.watch> | undefined;
  let publicWatcher: ReturnType<typeof chokidar.watch> | undefined;

  // A single mutex around every regeneration path (content-only and
  // config-triggered): `generateApp` and `writeGeneratedData` both write
  // into `.makit/` while a live `next dev`/Turbopack process watches it, and
  // running two of these passes concurrently — e.g. a source-file save
  // landing mid-config-reload — is what was corrupting the compiled CSS
  // (spec §43). Pending triggers that land while busy are coalesced into at
  // most one follow-up run each; a pending config reload takes priority
  // since it already re-runs content regeneration too.
  let busy = false;
  let pendingRegenerate = false;
  let pendingReloadConfig = false;

  function runNext(): void {
    if (pendingReloadConfig) {
      pendingReloadConfig = false;
      pendingRegenerate = false;
      reloadConfig();
    } else if (pendingRegenerate) {
      pendingRegenerate = false;
      runRegenerate();
    }
  }

  function runExclusive(task: () => Promise<void>): void {
    busy = true;
    task().finally(() => {
      busy = false;
      runNext();
    });
  }

  const runRegenerate = (): void => {
    if (busy) {
      pendingRegenerate = true;
      return;
    }
    runExclusive(async () => {
      try {
        const paths = await regenerateContent(config, logger);
        metadataWatchPaths = paths;
        watchMetadataDependencies();
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
      }
    });
  };

  function watchSources(): void {
    sourceWatcher?.close();
    const watchPaths = config.i18n.locales.map((locale) => join(config.root, locale.sourceDir));
    sourceWatcher = chokidar.watch(watchPaths, { ignoreInitial: true });
    sourceWatcher.on("all", (event, path) => {
      logger.debug(`${event}: ${relative(config.root, path)}`);
      runRegenerate();
    });
  }

  // Local files a `.meta.ts`/`.makit.ts` imports can live outside every
  // watched sourceDir (a shared `metadata/` module at the project root is
  // the common case) — the dependency set changes as authors edit imports,
  // so this watcher is rebuilt after every regeneration (spec §19, §43).
  function watchMetadataDependencies(): void {
    metadataWatcher?.close();
    if (metadataWatchPaths.length === 0) {
      metadataWatcher = undefined;
      return;
    }
    metadataWatcher = chokidar.watch(metadataWatchPaths, { ignoreInitial: true });
    metadataWatcher.on("all", (event, path) => {
      logger.debug(`${event}: ${relative(config.root, path)}`);
      runRegenerate();
    });
  }

  function watchPublicDir(): void {
    publicWatcher?.close();
    const publicSrcDir = join(config.root, config.publicDir);
    const publicDestDir = join(makitDir, "public");
    if (!existsSync(publicSrcDir)) {
      publicWatcher = undefined;
      return;
    }
    publicWatcher = chokidar.watch(publicSrcDir, { ignoreInitial: true });
    publicWatcher.on("all", () => {
      cp(publicSrcDir, publicDestDir, { recursive: true })
        .then(() => logger.success("Synced public/"))
        .catch((error: unknown) => {
          logger.error(error instanceof Error ? error.message : String(error));
        });
    });
  }

  watchSources();
  watchMetadataDependencies();
  watchPublicDir();

  // `makit.config.ts` itself (spec §43): most fields (title, theme, navigation,
  // collections, home, i18n messages, ...) only affect `.makit/generated/*`
  // JSON read at request time, so reloading and regenerating picks them up
  // live. Fields baked into `.makit/next.config.mjs` at generateApp-time
  // (basePath, trailingSlash, i18n.enabled's locale routing) still need a
  // `next dev` restart — Next.js itself doesn't hot-reload its own config.
  const reloadConfig = (): void => {
    if (busy) {
      pendingReloadConfig = true;
      return;
    }
    runExclusive(async () => {
      logger.info(`Config changed: ${relative(config.root, config.configPath)} — reloading`);
      try {
        const reloaded = await loadConfig({ cwd: config.root, configPath: config.configPath });
        config = reloaded;
        await generateApp(config);
        watchSources();
        watchPublicDir();
        const paths = await regenerateContent(config, logger);
        metadataWatchPaths = paths;
        watchMetadataDependencies();
        logger.info(
          "Regenerated from the new config. Changes to basePath/trailingSlash/i18n routing " +
            "require restarting `makit dev` to fully take effect.",
        );
      } catch (error) {
        logger.error(
          `Failed to reload config: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  };

  const configWatcher = chokidar.watch(config.configPath, { ignoreInitial: true });
  configWatcher.on("change", reloadConfig);

  const nextBin = join(resolvePackageRoot("next"), "dist", "bin", "next");
  const child = spawn(
    process.execPath,
    [nextBin, "dev", "--port", String(options.port), "--hostname", options.host],
    { cwd: makitDir, stdio: options.silent ? "ignore" : "inherit" },
  );

  return {
    close: () =>
      new Promise((resolvePromise) => {
        Promise.all([
          sourceWatcher?.close(),
          metadataWatcher?.close(),
          publicWatcher?.close(),
          configWatcher.close(),
        ]).finally(() => {
          child.once("exit", () => resolvePromise());
          child.kill();
        });
      }),
  };
}
