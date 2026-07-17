import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import type { Jiti } from "jiti";
import {
  createMetadataJiti,
  loadMetadataFile,
  metadataLoadDiagnostics,
} from "../metadata/loader.js";
import type { PageMetadata } from "../metadata/types.js";
import { parseFrontMatter } from "../markdown/frontmatter.js";
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
import type { Diagnostic } from "./validation.js";

export interface BuildPageResult {
  page: GeneratedPage;
  warnings: string[];
  diagnostics: Diagnostic[];
  /** Local files imported by the page's `.meta.ts`, for watching and cache keys (spec §19, §22, §43). */
  metadataDependencies: string[];
}

/**
 * Resolves page metadata from `.meta.ts` and/or Markdown front matter (spec
 * §17 extension): `.meta.ts` is the primary mechanism, but a flat
 * (non-nested) front matter block is accepted as a lightweight alternative
 * for pages that only need scalar overrides. The two are mutually
 * exclusive — a page must not define both. `validation.disallowFrontMatter`
 * forbids front matter entirely, forcing metadata through `.meta.ts`.
 */
async function resolvePageMetadata(
  raw: string,
  file: SourceFile,
  config: ResolvedConfig,
  jiti?: Jiti,
): Promise<{
  metadata: PageMetadata;
  content: string;
  diagnostics: Diagnostic[];
  dependencies: string[];
}> {
  const diagnostics: Diagnostic[] = [];
  const frontMatter = parseFrontMatter(raw, file.absolutePath);

  if (frontMatter.metadata && config.validation.disallowFrontMatter) {
    throw new MakitError(
      "front-matter-not-supported",
      `${file.absolutePath} starts with a YAML front matter block, but validation.disallowFrontMatter ` +
        `is enabled. Move page metadata into "${basename(file.relativePath).replace(/\.(md|markdown)$/i, ".meta.ts")}" ` +
        "(definePageMetadata) instead.",
    );
  }

  let metadata: PageMetadata = {};
  let dependencies: string[] = [];
  if (file.metadataPath) {
    if (frontMatter.metadata) {
      throw new MakitError(
        "front-matter-conflicts-with-metadata",
        `${file.absolutePath} defines both front matter and "${basename(file.metadataPath)}". ` +
          "Use only one source of page metadata for a given page.",
      );
    }
    const loaded = await loadMetadataFile<PageMetadata>(file.metadataPath, "page", {
      projectRoot: config.root,
      jiti,
    });
    metadata = loaded.value;
    diagnostics.push(...metadataLoadDiagnostics(loaded));
    dependencies = loaded.dependencies;
  } else if (frontMatter.metadata) {
    metadata = frontMatter.metadata;
  }

  return { metadata, content: frontMatter.content, diagnostics, dependencies };
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
  const { metadata, content, diagnostics, dependencies } = await resolvePageMetadata(
    raw,
    file,
    config,
    jiti,
  );

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

  const cached = await cache?.get(content, file.relativePath, localePrefix, file.collection.id);
  const processed =
    cached ??
    (await processMarkdown(processor, content, config, {
      currentRelativePath: file.relativePath,
      localePrefix,
      collectionSegments: file.collection.pathSegments,
    }));
  if (!cached) {
    await cache?.set(content, file.relativePath, localePrefix, file.collection.id, processed);
  }

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
    warnings: processed.warnings.map((warning) => `${file.relativePath}: ${warning}`),
    diagnostics,
    metadataDependencies: dependencies,
  };
}

export interface BuildAllPagesResult {
  pages: GeneratedPage[];
  warnings: string[];
  diagnostics: Diagnostic[];
  /** Every `.meta.ts` and its local import dependencies, for watching (spec §19, §43). */
  metadataPaths: string[];
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
  const diagnostics: Diagnostic[] = [];
  const metadataPaths: string[] = [];

  for (const file of sourceFiles) {
    const result = await buildPage(file, config, processor, cache, jiti);
    pages.push(result.page);
    warnings.push(...result.warnings);
    diagnostics.push(...result.diagnostics);
    if (file.metadataPath) metadataPaths.push(file.metadataPath, ...result.metadataDependencies);
  }

  detectDuplicateRoutes(pages);
  detectDuplicatePageIds(pages);

  return { pages, warnings, diagnostics, metadataPaths };
}
