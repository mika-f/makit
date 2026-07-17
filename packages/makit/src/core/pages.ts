import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import type { Jiti } from "jiti";
import { createMetadataJiti, loadMetadataFile } from "../metadata/loader.js";
import type { PageMetadata } from "../metadata/types.js";
import { createMarkdownProcessor, processMarkdown } from "../markdown/pipeline.js";
import type { GeneratedPage } from "../types/page.js";
import type { ResolvedConfig } from "../types/resolved-config.js";
import { BuildCache } from "./cache.js";
import type { ResolvedCollection } from "./collections.js";
import { MakitError } from "./errors.js";
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

/** Matches a YAML front matter block at the very start of a file. */
const FRONT_MATTER_RE = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

/**
 * YAML front matter is not page metadata in v0.2 (spec §17): with
 * `validation.disallowFrontMatter` (the default) a leading `---` block is a
 * build error pointing at `.meta.ts`; otherwise it stays in the body as
 * ordinary Markdown.
 */
function checkFrontMatter(raw: string, file: SourceFile, config: ResolvedConfig): void {
  if (!config.validation.disallowFrontMatter) return;
  if (!FRONT_MATTER_RE.test(raw)) return;
  throw new MakitError(
    "front-matter-not-supported",
    `${file.absolutePath} starts with a YAML front matter block. ` +
      `Move page metadata into "${basename(file.relativePath).replace(/\.(md|markdown)$/i, ".meta.ts")}" ` +
      "(definePageMetadata), or set validation.disallowFrontMatter to false to keep the block as body text.",
  );
}

/** Assembles one `GeneratedPage` from a scanned source file. */
export async function buildPage(
  file: SourceFile,
  config: ResolvedConfig,
  processor: ReturnType<typeof createMarkdownProcessor>,
  cache?: BuildCache,
  jiti?: Jiti,
): Promise<BuildPageResult> {
  const raw = await readFile(file.absolutePath, "utf-8");
  checkFrontMatter(raw, file, config);

  const warnings: string[] = [];
  let metadata: PageMetadata = {};
  if (file.metadataPath) {
    const loaded = await loadMetadataFile<PageMetadata>(file.metadataPath, "page", {
      projectRoot: config.root,
      jiti,
    });
    metadata = loaded.value;
    warnings.push(...loaded.warnings.map((warning) => warning.message));
  }

  const pathSegments = filePathToSegments(file.relativePath);
  const slugSegments = resolveSlugSegments(metadata.slug, pathSegments);
  // Full URL segments below the locale prefix: collection path, then slug (spec §28.1).
  const segments = [...file.collection.pathSegments, ...slugSegments];
  const localePrefix = config.i18n.enabled ? file.locale.urlLocale : undefined;

  const route = buildRoute(slugSegments, {
    basePath: config.basePath,
    localePrefix,
    collectionSegments: file.collection.pathSegments,
    trailingSlash: config.build.trailingSlash,
  });
  // Auto IDs derive from the file path (not slug overrides) so URLs can
  // change without breaking translation pairing (spec §18, §29).
  const pageId = derivePageId(metadata.id, pathSegments);

  const cached = await cache?.get(raw, file.relativePath, localePrefix);
  const processed =
    cached ??
    (await processMarkdown(processor, raw, config, {
      currentRelativePath: file.relativePath,
      localePrefix,
    }));
  if (!cached) await cache?.set(raw, file.relativePath, localePrefix, processed);

  // Title resolution chain (spec §17): .meta.ts -> first H1 -> filename -> pageId.
  const firstH1 = processed.headings.find((heading) => heading.depth === 1)?.text;
  const filenameTitle = humanizeSlug(basename(file.relativePath, extname(file.relativePath)));
  const title = metadata.title ?? firstH1 ?? filenameTitle ?? pageId;
  const titleSource: GeneratedPage["titleSource"] = metadata.title
    ? "metadata"
    : firstH1
      ? "heading"
      : filenameTitle
        ? "filename"
        : "pageId";

  const page: GeneratedPage = {
    pageId,
    collectionId: file.collection.id,
    route,
    segments,
    pathSegments,
    locale: file.locale.urlLocale,
    contentLocale: file.locale.urlLocale,
    sourcePath: file.absolutePath,
    metadataPath: file.metadataPath,
    isFallback: false,
    title,
    titleSource,
    pageIdSource: metadata.id ? "metadata" : "auto",
    description: metadata.description,
    html: processed.html,
    headings: processed.headings,
    draft: metadata.draft ?? false,
    hidden: metadata.hidden ?? false,
    sidebar: metadata.sidebar ?? true,
    tableOfContents: metadata.tableOfContents ?? true,
    order: metadata.order,
    navigation: metadata.navigation,
    taxonomy: metadata.taxonomy,
    // Filled by the navigation engine (nav-decorate) after nav resolution.
    hierarchy: [],
    breadcrumbs: [],
    metadata: {
      canonical: metadata.canonical,
      noindex: metadata.noindex ?? false,
      nofollow: metadata.nofollow ?? false,
      image: metadata.image,
      alternates: [],
    },
  };

  return {
    page,
    warnings: [
      ...warnings,
      ...processed.warnings.map((warning) => `${file.relativePath}: ${warning}`),
    ],
  };
}

export interface BuildAllPagesResult {
  pages: GeneratedPage[];
  warnings: string[];
}

export interface BuildAllPagesOptions {
  /** Reuses cached remark/rehype/Shiki output across invocations (spec §22). Defaults to `true`. */
  cache?: boolean;
}

/**
 * Scans every (locale, collection) directory and builds every page. Throws
 * on duplicate routes (per locale) or page ids (per locale and collection)
 * — spec §29, §45.
 */
export async function buildAllPages(
  config: ResolvedConfig,
  collections: readonly ResolvedCollection[],
  options: BuildAllPagesOptions = {},
): Promise<BuildAllPagesResult> {
  const sourceFiles = await scanSourceFiles(config, collections);
  const processor = createMarkdownProcessor(config);
  const cache = options.cache === false ? undefined : await BuildCache.create(config);
  // One jiti instance per build pass; fresh per rebuild so edits re-evaluate.
  const jiti = createMetadataJiti();

  const pages: GeneratedPage[] = [];
  const warnings: string[] = [];

  for (const file of sourceFiles) {
    const result = await buildPage(file, config, processor, cache, jiti);
    pages.push(result.page);
    warnings.push(...result.warnings);
  }

  detectDuplicateRoutes(pages);
  detectDuplicatePageIds(pages);

  return { pages, warnings };
}
