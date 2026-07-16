import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { parseFrontMatter } from "../markdown/frontmatter.js";
import { createMarkdownProcessor, processMarkdown } from "../markdown/pipeline.js";
import type { GeneratedPage } from "../types/page.js";
import type { ResolvedConfig } from "../types/resolved-config.js";
import { BuildCache } from "./cache.js";
import {
  buildRoute,
  derivePageId,
  detectDuplicatePageIds,
  detectDuplicateRoutes,
  filePathToSegments,
  resolveSlugSegments,
} from "./routes.js";
import type { SourceFile } from "./scanner.js";
import { scanSourceFiles } from "./scanner.js";
import { humanizeSlug } from "./text.js";

export interface BuildPageResult {
  page: GeneratedPage;
  warnings: string[];
}

/** Assembles one `GeneratedPage` from a scanned source file (spec §23). */
export async function buildPage(
  file: SourceFile,
  config: ResolvedConfig,
  processor: ReturnType<typeof createMarkdownProcessor>,
  cache?: BuildCache,
): Promise<BuildPageResult> {
  const raw = await readFile(file.absolutePath, "utf-8");
  const { data: frontMatter, content } = parseFrontMatter(raw, file.absolutePath);

  const fallbackSegments = filePathToSegments(file.relativePath);
  const segments = resolveSlugSegments(frontMatter.slug, fallbackSegments);
  const localePrefix = config.i18n.enabled ? file.locale.urlLocale : undefined;

  const route = buildRoute(segments, {
    basePath: config.basePath,
    localePrefix,
    trailingSlash: config.build.trailingSlash,
  });
  const pageId = derivePageId(frontMatter.id, segments);

  const cached = await cache?.get(content, file.relativePath, localePrefix);
  const processed =
    cached ??
    (await processMarkdown(processor, content, config, {
      currentRelativePath: file.relativePath,
      localePrefix,
    }));
  if (!cached) await cache?.set(content, file.relativePath, localePrefix, processed);

  // Title fallback chain (spec §14.2): front matter -> first H1 -> filename -> pageId.
  const firstH1 = processed.headings.find((heading) => heading.depth === 1)?.text;
  const filenameTitle = humanizeSlug(basename(file.relativePath, extname(file.relativePath)));
  const title = frontMatter.title ?? firstH1 ?? filenameTitle ?? pageId;
  const titleSource: GeneratedPage["titleSource"] = frontMatter.title
    ? "frontmatter"
    : firstH1
      ? "heading"
      : filenameTitle
        ? "filename"
        : "pageId";

  const page: GeneratedPage = {
    pageId,
    route,
    segments,
    locale: file.locale.urlLocale,
    contentLocale: file.locale.urlLocale,
    sourcePath: file.absolutePath,
    isFallback: false,
    title,
    titleSource,
    description: frontMatter.description,
    html: processed.html,
    headings: processed.headings,
    draft: frontMatter.draft ?? false,
    hidden: frontMatter.hidden ?? false,
    sidebar: frontMatter.sidebar ?? true,
    tableOfContents: frontMatter.tableOfContents ?? true,
    order: frontMatter.order,
    navigation: frontMatter.navigation,
    metadata: {
      canonical: frontMatter.canonical,
      noindex: frontMatter.noindex ?? false,
      nofollow: frontMatter.nofollow ?? false,
      image: frontMatter.image,
      alternates: [],
    },
  };

  return {
    page,
    warnings: processed.warnings.map((warning) => `${file.relativePath}: ${warning}`),
  };
}

export interface BuildAllPagesResult {
  pages: GeneratedPage[];
  warnings: string[];
}

export interface BuildAllPagesOptions {
  /** Reuses cached remark/rehype/Shiki output across invocations (spec §29). Defaults to `true`. */
  cache?: boolean;
}

/**
 * Scans every locale's sourceDir and builds every page (spec §6 Source
 * Scanner + Markdown Processor + Route Generator). Throws on duplicate
 * routes or page ids within a locale (spec §15.3, §14.1).
 */
export async function buildAllPages(
  config: ResolvedConfig,
  options: BuildAllPagesOptions = {},
): Promise<BuildAllPagesResult> {
  const sourceFiles = await scanSourceFiles(config);
  const processor = createMarkdownProcessor(config);
  const cache = options.cache === false ? undefined : await BuildCache.create(config);

  const pages: GeneratedPage[] = [];
  const warnings: string[] = [];

  for (const file of sourceFiles) {
    const result = await buildPage(file, config, processor, cache);
    pages.push(result.page);
    warnings.push(...result.warnings);
  }

  detectDuplicateRoutes(pages);
  detectDuplicatePageIds(pages);

  return { pages, warnings };
}
