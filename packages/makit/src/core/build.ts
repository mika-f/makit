import { spawn } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ResolvedConfig } from "../types/resolved-config.js";
import { generateApp } from "./app-generator/index.js";
import { MakitError } from "./errors.js";
import { writeGeneratedData } from "./generate.js";
import { generateFallbackPages, populateAlternates } from "./i18n.js";
import { resolvePackageRoot } from "./link-runtime-deps.js";
import type { Logger } from "./logger.js";
import { generateAllNavigation } from "./navigation.js";
import { buildAllPages } from "./pages.js";
import { generateSitemapXml } from "./sitemap.js";
import type { Diagnostic } from "./validation.js";
import { selectPromotedDiagnostics, validatePages } from "./validation.js";

export interface BuildOptions {
  clean?: boolean;
  strict?: boolean;
  silent?: boolean;
}

export interface BuildResult {
  pageCount: number;
  localeCount: number;
  fallbackCount: number;
  warnings: string[];
  diagnostics: Diagnostic[];
  outDir: string;
}

function runNextBuild(makitDir: string, silent: boolean): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const nextBin = join(resolvePackageRoot("next"), "dist", "bin", "next");
    const child = spawn(process.execPath, [nextBin, "build"], {
      cwd: makitDir,
      stdio: silent ? "ignore" : "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new MakitError("next-build-failed", `\`next build\` exited with code ${code}`));
    });
  });
}

/**
 * Runs the full production build pipeline (spec §9.4): scan, process
 * Markdown, resolve i18n fallbacks/alternates, generate navigation,
 * write `.makit/generated/`, (re)generate `.makit/app`, run `next build`,
 * move the static export into `outDir`, and write `sitemap.xml`.
 */
export async function build(
  config: ResolvedConfig,
  options: BuildOptions,
  logger: Logger,
): Promise<BuildResult> {
  const makitDir = join(config.root, ".makit");
  const outDirAbsolute = join(config.root, config.outDir);
  const shouldClean = options.clean ?? config.build.clean;
  const strict = options.strict ?? config.validation.strict;

  if (shouldClean) {
    await rm(outDirAbsolute, { recursive: true, force: true });
  }

  const { pages: scannedPages, warnings: pipelineWarnings } = await buildAllPages(config);
  // Draft pages are visible in `makit dev` but excluded from production output (spec §14.4).
  const productionPages = scannedPages.filter((page) => !page.draft);
  logger.success(
    `Processed ${productionPages.length} page(s) across ${config.i18n.locales.length} locale(s)`,
  );

  const fallbackPages = generateFallbackPages(productionPages, config);
  if (fallbackPages.length > 0) {
    logger.info(`Generated ${fallbackPages.length} fallback page(s)`);
  }

  const allPages = populateAlternates([...productionPages, ...fallbackPages], config);

  const { byLocale: navigationByLocale, warnings: navigationWarnings } = generateAllNavigation(
    allPages,
    config,
  );
  const warnings = [...pipelineWarnings, ...navigationWarnings];

  for (const warning of warnings) {
    logger.warn(warning);
  }

  const diagnostics = validatePages(allPages, config, { navigationByLocale });
  for (const diagnostic of diagnostics) {
    logger.warn(
      diagnostic.sourcePath
        ? `${diagnostic.sourcePath}: ${diagnostic.message}`
        : diagnostic.message,
      diagnostic.code,
    );
  }

  const promoted = selectPromotedDiagnostics(diagnostics, { ...config.validation, strict });
  if (promoted.length > 0 || (strict && warnings.length > 0)) {
    throw new MakitError(
      "markdown-processing-failed",
      `Strict mode: ${warnings.length + promoted.length} warning(s) treated as errors (see above).`,
    );
  }

  await writeGeneratedData(config, allPages, navigationByLocale);
  logger.success("Wrote .makit/generated/");

  await generateApp(config);
  logger.success("Generated .makit/app");

  await runNextBuild(makitDir, options.silent ?? false);
  logger.success("Built Next.js static export");

  const exportedDir = join(makitDir, "out");
  await mkdir(join(outDirAbsolute, ".."), { recursive: true });
  await rm(outDirAbsolute, { recursive: true, force: true });
  await cp(exportedDir, outDirAbsolute, { recursive: true });

  const sitemapXml = generateSitemapXml(allPages, config);
  if (sitemapXml) {
    await writeFile(join(outDirAbsolute, "sitemap.xml"), sitemapXml, "utf-8");
  }

  return {
    pageCount: allPages.length,
    localeCount: config.i18n.locales.length,
    fallbackCount: fallbackPages.length,
    warnings,
    diagnostics,
    outDir: outDirAbsolute,
  };
}
