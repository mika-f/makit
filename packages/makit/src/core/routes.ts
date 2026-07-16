import { MakitError } from "./errors.js";

const MARKDOWN_EXTENSION_RE = /\.(md|markdown)$/i;

/** Converts a source-relative file path into route segments (spec §15.1). */
export function filePathToSegments(relativePath: string): string[] {
  const withoutExt = relativePath.replace(MARKDOWN_EXTENSION_RE, "");
  const parts = withoutExt.split("/").filter((part) => part.length > 0);
  if (parts.length > 0 && parts[parts.length - 1] === "index") {
    parts.pop();
  }
  return parts;
}

/** A `slug` front matter override replaces the file-path-derived segments entirely (spec §14.3). */
export function resolveSlugSegments(
  slug: string | string[] | undefined,
  fallback: string[],
): string[] {
  if (slug === undefined) return fallback;
  return Array.isArray(slug) ? slug : [slug];
}

export interface BuildRouteOptions {
  basePath: string;
  /** URL-facing locale prefix (e.g. "ja-jp"). Omit when i18n is disabled. */
  localePrefix?: string;
  trailingSlash: boolean;
}

/** Builds the final route string from segments (spec §15.1-15.2). */
export function buildRoute(segments: string[], options: BuildRouteOptions): string {
  const allSegments = options.localePrefix ? [options.localePrefix, ...segments] : segments;

  if (allSegments.length === 0) {
    return options.basePath ? `${options.basePath}/` : "/";
  }

  const path = `/${allSegments.join("/")}`;
  const withSlash = options.trailingSlash ? `${path}/` : path;
  return `${options.basePath}${withSlash}`;
}

/** `id` from front matter, falling back to the normalized route segments (spec §14.1, §16.6). */
export function derivePageId(frontMatterId: string | undefined, segments: string[]): string {
  if (frontMatterId) return frontMatterId;
  return segments.length > 0 ? segments.join("/") : "index";
}

interface RouteConflictInfo {
  route: string;
  locale: string;
  sourcePath: string;
}

/** Throws `MakitError("duplicate-route", …)` if two pages in the same locale share a route (spec §15.3). */
export function detectDuplicateRoutes(pages: readonly RouteConflictInfo[]): void {
  const seen = new Map<string, string>();
  for (const page of pages) {
    const key = `${page.locale}:${page.route}`;
    const existing = seen.get(key);
    if (existing) {
      throw new MakitError(
        "duplicate-route",
        `Duplicate route "${page.route}" in locale "${page.locale}":\n  ${existing}\n  ${page.sourcePath}`,
      );
    }
    seen.set(key, page.sourcePath);
  }
}

interface PageIdConflictInfo {
  pageId: string;
  locale: string;
  sourcePath: string;
}

/** Throws `MakitError("duplicate-page-id", …)` if two pages in the same locale share a pageId (spec §14.1). */
export function detectDuplicatePageIds(pages: readonly PageIdConflictInfo[]): void {
  const seen = new Map<string, string>();
  for (const page of pages) {
    const key = `${page.locale}:${page.pageId}`;
    const existing = seen.get(key);
    if (existing) {
      throw new MakitError(
        "duplicate-page-id",
        `Duplicate page id "${page.pageId}" in locale "${page.locale}":\n  ${existing}\n  ${page.sourcePath}`,
      );
    }
    seen.set(key, page.sourcePath);
  }
}
