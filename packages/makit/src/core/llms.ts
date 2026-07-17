import { readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import type { GeneratedPage } from "../types/page.js";
import type { ResolvedConfig } from "../types/resolved-config.js";
import { atomicWriteFile } from "./atomic-write.js";

/** A real source page that can be safely exposed as its original Markdown. */
function isSourcePage(page: GeneratedPage): boolean {
  return !page.isFallback && !page.draft && isAbsolute(page.sourcePath);
}

/** Returns the Markdown URL that corresponds to a rendered page route. */
export function markdownPathForRoute(route: string): string {
  const pathname = route.replace(/\/+$/, "") || "/";
  return pathname === "/" ? "/index.md" : `${pathname}.md`;
}

function absoluteUrl(config: ResolvedConfig, path: string): string {
  return config.siteUrl ? `${config.siteUrl.replace(/\/$/, "")}${path}` : path;
}

function pageSummary(page: GeneratedPage): string {
  return page.description ? `: ${page.description}` : "";
}

/**
 * Emits the llms.txt convention files and a raw Markdown representation for
 * every real source page. Generated fallback and collection-index pages do
 * not have an original source file, so they are deliberately omitted.
 */
export async function writeLlmsFiles(
  outDir: string,
  pages: readonly GeneratedPage[],
  config: ResolvedConfig,
): Promise<void> {
  const sourcePages = pages.filter(isSourcePage);
  const rawPages = await Promise.all(
    sourcePages.map(async (page) => ({ page, content: await readFile(page.sourcePath, "utf-8") })),
  );

  await Promise.all(
    rawPages.map(({ page, content }) =>
      atomicWriteFile(join(outDir, markdownPathForRoute(page.route)), content),
    ),
  );

  const intro = [`# ${config.title}`, ...(config.description ? [`> ${config.description}`] : [])];
  const list = rawPages.map(({ page }) => {
    const path = markdownPathForRoute(page.route);
    return `- [${page.title}](${absoluteUrl(config, path)})${pageSummary(page)}`;
  });
  const llms = [...intro, "", "## Documentation", "", ...list, ""].join("\n");

  const fullPages = rawPages.flatMap(({ page, content }) => [
    `## ${page.title}`,
    "",
    `Source: ${absoluteUrl(config, markdownPathForRoute(page.route))}`,
    "",
    content.trimEnd(),
    "",
  ]);
  const llmsFull = [...intro, "", "## Documentation", "", ...fullPages].join("\n");

  await Promise.all([
    atomicWriteFile(join(outDir, "llms.txt"), llms),
    atomicWriteFile(join(outDir, "llms-full.txt"), llmsFull),
  ]);
}
