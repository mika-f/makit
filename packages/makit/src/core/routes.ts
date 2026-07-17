import { MakitError } from "./errors.js";
import { parseOrderedSegment } from "./order-prefix.js";

const MARKDOWN_EXTENSION_RE = /\.(md|markdown)$/i;

export interface SegmentParseOptions {
  /** Whether a leading `NN-` on a segment is stripped as an ordering prefix (ORDER-PREFIX §18). @default true */
  numericPrefixes?: boolean;
}

/**
 * Converts a source-relative file path into route segments (spec §15.1).
 * Numeric ordering prefixes (`01-installation` -> `installation`) are
 * stripped per segment before the trailing `index` segment is dropped, so
 * both `index.md` and `01-index.md` resolve the same way (ORDER-PREFIX §4,
 * §11).
 */
export function filePathToSegments(
  relativePath: string,
  options: SegmentParseOptions = {},
): string[] {
  const numericPrefixes = options.numericPrefixes ?? true;
  const withoutExt = relativePath.replace(MARKDOWN_EXTENSION_RE, "");
  const rawParts = withoutExt.split("/").filter((part) => part.length > 0);
  const parts = numericPrefixes
    ? rawParts.map((part) => parseOrderedSegment(part, relativePath).name)
    : rawParts;
  if (parts.length > 0 && parts[parts.length - 1] === "index") {
    parts.pop();
  }
  return parts;
}

/**
 * The numeric ordering prefix on a file's own name, independent of any
 * directory prefixes and of whether the file is dropped as an `index`
 * segment (ORDER-PREFIX §19 `filenameOrder`). Returns `undefined` when
 * disabled, without attempting to parse the name at all.
 */
export function fileNameOrder(
  relativePath: string,
  options: SegmentParseOptions = {},
): number | undefined {
  if (!(options.numericPrefixes ?? true)) return undefined;
  const withoutExt = relativePath.replace(MARKDOWN_EXTENSION_RE, "");
  const base = withoutExt.split("/").pop();
  if (!base) return undefined;
  return parseOrderedSegment(base, relativePath).order;
}

/** A `slug` in `.meta.ts` replaces the file-path-derived segments entirely (spec §28.2). */
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
  /** The collection's URL prefix segments (spec §28.1). */
  collectionSegments?: readonly string[];
  trailingSlash: boolean;
}

/** Builds the final route string from segments (spec §28: locale prefix, then collection path, then slug). */
export function buildRoute(segments: string[], options: BuildRouteOptions): string {
  const withCollection = options.collectionSegments
    ? [...options.collectionSegments, ...segments]
    : segments;
  const allSegments = options.localePrefix
    ? [options.localePrefix, ...withCollection]
    : withCollection;

  if (allSegments.length === 0) {
    return options.basePath ? `${options.basePath}/` : "/";
  }

  const path = `/${allSegments.join("/")}`;
  const withSlash = options.trailingSlash ? `${path}/` : path;
  return `${options.basePath}${withSlash}`;
}

/**
 * `id` from `.meta.ts`, falling back to a dot-joined ID derived from the
 * relative file path — `guides/getting-started.md` → `guides.getting-started`
 * (spec §18, §29). Auto IDs come from the *file path*, not any `slug`
 * override, so URLs can change without breaking translation pairing.
 */
export function derivePageId(explicitId: string | undefined, pathSegments: string[]): string {
  if (explicitId) return explicitId;
  return pathSegments.length > 0 ? pathSegments.join(".") : "index";
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
  collectionId: string;
  sourcePath: string;
}

/** Throws `MakitError("duplicate-page-id", …)` if two pages in the same locale and collection share a pageId (spec §29). */
export function detectDuplicatePageIds(pages: readonly PageIdConflictInfo[]): void {
  const seen = new Map<string, string>();
  for (const page of pages) {
    const key = `${page.locale}:${page.collectionId}:${page.pageId}`;
    const existing = seen.get(key);
    if (existing) {
      throw new MakitError(
        "duplicate-page-id",
        `Duplicate page id "${page.pageId}" in locale "${page.locale}", collection "${page.collectionId}":\n  ${existing}\n  ${page.sourcePath}`,
      );
    }
    seen.set(key, page.sourcePath);
  }
}
