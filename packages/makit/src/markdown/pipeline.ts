import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { unified, type Processor } from "unified";
import { VFile } from "vfile";
import type { ResolvedConfig } from "../types/resolved-config.js";
import type { GeneratedHeading } from "../types/page.js";
import { rehypeCollectHeadings } from "./rehype/collect-headings.js";
import { rehypeExternalLinks } from "./rehype/external-links.js";
import { rehypeRewriteMarkdownLinks, type LinkRewriteContext } from "./rehype/rewrite-links.js";
import { rehypeShikiHighlight } from "./rehype/shiki-highlight.js";
import { remarkCodeFilename } from "./remark/code-filename.js";

export interface MarkdownProcessResult {
  html: string;
  headings: GeneratedHeading[];
  warnings: string[];
}

export interface MarkdownProcessContext {
  /** Current file's path relative to its collection's directory, forward-slash separated. */
  currentRelativePath: string;
  /** URL-facing locale prefix (e.g. "ja-jp"). Omit when i18n is disabled. */
  localePrefix?: string;
  /** The collection's URL prefix segments (spec §28.1). */
  collectionSegments?: readonly string[];
}

// biome-ignore-start: unified's fluent `.use()` typing can't express a dynamically-built
// plugin chain; user-supplied plugins are genuinely untyped (spec `UnifiedPluginEntry = unknown`).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProcessor = Processor<any, any, any, any, any>;

function applyUnifiedPlugins(processor: AnyProcessor, plugins: readonly unknown[]): void {
  // `.use()`'s overloads can't be resolved against a dynamically-typed plugin list;
  // treat it as a plain variadic function instead of fighting unified's fluent typing.
  const use = processor.use.bind(processor) as (...args: unknown[]) => AnyProcessor;
  for (const plugin of plugins) {
    if (Array.isArray(plugin)) {
      use(...plugin);
    } else {
      use(plugin);
    }
  }
}
// biome-ignore-end

/**
 * Builds the shared unified processor for a project (spec §19.1). One
 * instance is reused across every file in the project; per-file state
 * (link rewriting context) flows through `file.data`, set by
 * `processMarkdown` before each run.
 */
export function createMarkdownProcessor(config: ResolvedConfig): AnyProcessor {
  const processor: AnyProcessor = unified().use(remarkParse);

  if (config.markdown.gfm) {
    processor.use(remarkGfm);
  }

  applyUnifiedPlugins(processor, config.markdown.remarkPlugins);
  processor.use(remarkCodeFilename);

  processor.use(remarkRehype, { allowDangerousHtml: config.markdown.allowDangerousHtml });

  if (config.markdown.allowDangerousHtml) {
    processor.use(rehypeRaw);
  }

  if (config.markdown.headingIds) {
    processor.use(rehypeSlug);
  }

  processor.use(rehypeCollectHeadings);
  processor.use(rehypeExternalLinks, config.markdown.externalLinks);
  processor.use(rehypeRewriteMarkdownLinks);

  applyUnifiedPlugins(processor, config.markdown.rehypePlugins);

  processor.use(rehypeShikiHighlight, config.markdown.shiki);
  processor.use(rehypeStringify, { allowDangerousHtml: config.markdown.allowDangerousHtml });

  return processor;
}

export async function processMarkdown(
  processor: AnyProcessor,
  content: string,
  config: ResolvedConfig,
  context: MarkdownProcessContext,
): Promise<MarkdownProcessResult> {
  const file = new VFile(content);
  file.data.linkRewriteContext = {
    currentRelativePath: context.currentRelativePath,
    basePath: config.basePath,
    localePrefix: context.localePrefix,
    collectionSegments: context.collectionSegments,
    trailingSlash: config.build.trailingSlash,
  } satisfies LinkRewriteContext;

  const result = await processor.process(file);

  return {
    html: String(result),
    headings: (result.data.headings as GeneratedHeading[] | undefined) ?? [],
    warnings: (result.data.warnings as string[] | undefined) ?? [],
  };
}
