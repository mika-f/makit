import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { NavigationGroup } from "../types/config.js";
import type { GeneratedPage } from "../types/page.js";
import type { ResolvedConfig } from "../types/resolved-config.js";

export interface WriteGeneratedDataResult {
  generatedDir: string;
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

/**
 * Writes `.makit/generated/` (spec §8.3): a page manifest, a site-wide data
 * file for the runtime, the resolved i18n config, and one JSON file per page.
 */
export async function writeGeneratedData(
  config: ResolvedConfig,
  pages: readonly GeneratedPage[],
  navigationByLocale: Readonly<Record<string, NavigationGroup[]>> = {},
): Promise<WriteGeneratedDataResult> {
  const generatedDir = join(config.root, ".makit", "generated");
  const pagesDir = join(generatedDir, "pages");
  const navigationDir = join(generatedDir, "navigation");

  await mkdir(generatedDir, { recursive: true });

  const manifest = {
    generatedAt: new Date().toISOString(),
    pages: pages.map((page) => ({
      pageId: page.pageId,
      route: page.route,
      segments: page.segments,
      locale: page.locale,
      title: page.title,
      draft: page.draft,
      hidden: page.hidden,
    })),
  };
  await writeJson(join(generatedDir, "manifest.json"), manifest);

  const site = {
    title: config.title,
    description: config.description,
    lang: config.lang,
    siteUrl: config.siteUrl,
    basePath: config.basePath,
    header: config.header,
    footer: config.footer,
    theme: config.theme,
    seo: config.seo,
    styles: config.styles,
    markdown: {
      tableOfContents: config.markdown.tableOfContents,
      code: config.markdown.code,
    },
  };
  await writeJson(join(generatedDir, "site.json"), site);

  await writeJson(join(generatedDir, "locales.json"), config.i18n);

  for (const page of pages) {
    const pagePath = join(pagesDir, page.locale, `${page.pageId}.json`);
    await mkdir(dirname(pagePath), { recursive: true });
    await writeJson(pagePath, page);
  }

  if (Object.keys(navigationByLocale).length > 0) {
    await mkdir(navigationDir, { recursive: true });
    for (const [locale, navigation] of Object.entries(navigationByLocale)) {
      await writeJson(join(navigationDir, `${locale}.json`), navigation);
    }
  }

  return { generatedDir };
}
