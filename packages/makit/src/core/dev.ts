import { spawn } from "node:child_process";
import { cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import chokidar from "chokidar";
import type { ResolvedConfig } from "../types/resolved-config.js";
import { generateApp } from "./app-generator/index.js";
import { writeGeneratedData } from "./generate.js";
import { generateFallbackPages, populateAlternates } from "./i18n.js";
import { resolvePackageRoot } from "./link-runtime-deps.js";
import type { Logger } from "./logger.js";
import { generateAllNavigation } from "./navigation.js";
import { buildAllPages } from "./pages.js";

export interface DevOptions {
  port: number;
  host: string;
}

export interface DevServer {
  close: () => Promise<void>;
}

async function regenerateContent(config: ResolvedConfig, logger: Logger): Promise<void> {
  // Unlike `makit build`, dev keeps draft pages visible (spec §14.4).
  const { pages, warnings } = await buildAllPages(config);
  const fallbackPages = generateFallbackPages(pages, config);
  const allPages = populateAlternates([...pages, ...fallbackPages], config);
  const { byLocale } = generateAllNavigation(allPages, config);
  await writeGeneratedData(config, allPages, byLocale);
  for (const warning of warnings) logger.warn(warning);
  logger.success(`Regenerated ${allPages.length} page(s)`);
}

/** Starts `next dev` over `.makit/app`, watching Markdown/public sources and regenerating on change (spec §9.3, §30). */
export async function startDevServer(
  config: ResolvedConfig,
  options: DevOptions,
  logger: Logger,
): Promise<DevServer> {
  const makitDir = join(config.root, ".makit");
  const publicSrcDir = join(config.root, config.publicDir);
  const publicDestDir = join(makitDir, "public");

  await generateApp(config);
  await regenerateContent(config, logger);

  const watchPaths = config.i18n.locales.map((locale) => join(config.root, locale.sourceDir));
  const watcher = chokidar.watch(watchPaths, { ignoreInitial: true });

  watcher.on("all", (event, path) => {
    logger.debug(`${event}: ${relative(config.root, path)}`);
    regenerateContent(config, logger).catch((error: unknown) => {
      logger.error(error instanceof Error ? error.message : String(error));
    });
  });

  let publicWatcher: ReturnType<typeof chokidar.watch> | undefined;
  if (existsSync(publicSrcDir)) {
    publicWatcher = chokidar.watch(publicSrcDir, { ignoreInitial: true });
    publicWatcher.on("all", () => {
      cp(publicSrcDir, publicDestDir, { recursive: true })
        .then(() => logger.success("Synced public/"))
        .catch((error: unknown) => {
          logger.error(error instanceof Error ? error.message : String(error));
        });
    });
  }

  logger.info(
    "Config file changes require restarting `makit dev` (spec §30 full re-analysis isn't applied live).",
  );

  const nextBin = join(resolvePackageRoot("next"), "dist", "bin", "next");
  const child = spawn(
    process.execPath,
    [nextBin, "dev", "--port", String(options.port), "--hostname", options.host],
    { cwd: makitDir, stdio: "inherit" },
  );

  return {
    close: () =>
      new Promise((resolvePromise) => {
        Promise.all([watcher.close(), publicWatcher?.close()]).finally(() => {
          child.once("exit", () => resolvePromise());
          child.kill();
        });
      }),
  };
}
