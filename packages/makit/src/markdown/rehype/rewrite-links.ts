import posix from "node:path/posix";
import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import { buildRoute, filePathToSegments } from "../../core/routes.js";

export interface LinkRewriteContext {
  /** Current file's path relative to its locale's sourceDir, forward-slash separated (e.g. "guides/configuration.md"). */
  currentRelativePath: string;
  basePath: string;
  /** URL-facing locale prefix (e.g. "ja-jp"). Omit when i18n is disabled. */
  localePrefix?: string;
  trailingSlash: boolean;
}

// Matches a relative (non-absolute, non-scheme, non-anchor-only) link ending in .md/.markdown,
// optionally followed by a #anchor.
const RELATIVE_MD_LINK_RE = /^(?!\/)(?![a-z][a-z0-9+.-]*:)(?!#)([^#?]+\.(?:md|markdown))(#.*)?$/i;

/** Rewrites `./guides/configuration.md` -> `/guides/configuration/` (spec §27.1). */
export function rewriteMarkdownLinkHref(href: string, ctx: LinkRewriteContext): string | undefined {
  const match = RELATIVE_MD_LINK_RE.exec(href);
  if (!match) return undefined;
  const [, pathPart, anchor] = match;

  const currentDir = posix.dirname(ctx.currentRelativePath);
  const resolved = posix.normalize(posix.join(currentDir, pathPart!));
  if (resolved === ".." || resolved.startsWith("../")) {
    // Escapes the locale's sourceDir root — not a valid page reference.
    // Leave the href untouched; link validation (a later phase) reports it.
    return undefined;
  }
  const segments = filePathToSegments(resolved);
  const route = buildRoute(segments, {
    basePath: ctx.basePath,
    localePrefix: ctx.localePrefix,
    trailingSlash: ctx.trailingSlash,
  });
  return `${route}${anchor ?? ""}`;
}

/** Reads the rewrite context from `file.data.linkRewriteContext`, set by the pipeline caller per-file. */
export function rehypeRewriteMarkdownLinks() {
  return (tree: Root, file: { data: Record<string, unknown> }) => {
    const ctx = file.data.linkRewriteContext as LinkRewriteContext | undefined;
    if (!ctx) return;

    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "a") return;
      const href = typeof node.properties.href === "string" ? node.properties.href : undefined;
      if (!href) return;
      const rewritten = rewriteMarkdownLinkHref(href, ctx);
      if (rewritten !== undefined) {
        node.properties.href = rewritten;
      }
    });
  };
}
