import type { PageTaxonomy } from "../metadata/types.js";

export interface GeneratedHeading {
  id: string;
  depth: number;
  text: string;
}

export interface GeneratedAlternate {
  /** URL-facing locale (lowercase, e.g. "ja-jp"). */
  urlLocale: string;
  /** Original BCP-47 tag used as the `hreflang` attribute value (e.g. "ja-JP"). */
  hreflang: string;
  href: string;
}

export interface GeneratedMetadata {
  canonical?: string;
  noindex: boolean;
  nofollow: boolean;
  image?: string;
  /** Real translations only; filled in once the i18n resolver has cross-referenced all locales. */
  alternates: GeneratedAlternate[];
}

/** One breadcrumb entry: Site > Collection > Section > Group > Page (spec §31). */
export interface GeneratedBreadcrumb {
  title: string;
  /** Absent for URL-less sections/groups — rendered as a plain label. */
  href?: string;
}

/** One ancestor in the page's canonical navigation hierarchy (spec §39). */
export interface PageHierarchyNode {
  type: "collection" | "section" | "group";
  id?: string;
  title: string;
  href?: string;
}

/** Prev/next link resolved from navigation order (spec §32). */
export interface GeneratedPageLink {
  pageId: string;
  title: string;
  href: string;
}

/** The page's canonical position in its collection's navigation (spec §30, §39). */
export interface GeneratedNavigationPosition {
  /** IDs of the section/group ancestors, root-first. */
  path: string[];
  /** Index in the flattened canonical navigation order. */
  index: number;
  prev?: GeneratedPageLink;
  next?: GeneratedPageLink;
}

export interface GeneratedPage {
  pageId: string;
  /** The collection this page belongs to (spec §39). */
  collectionId: string;
  route: string;
  /** Full URL path segments below the locale prefix (collection prefix + slug). */
  segments: string[];
  /**
   * File-path-derived segments relative to the collection dir — drives auto
   * navigation (spec §27). Unlike `segments`, route-group directories
   * (`(marketing)`) are kept (unwrapped) here so they still form a
   * navigation tree node (ROUTE-GROUPS §3). Internal.
   */
  pathSegments: string[];
  /** URL-facing locale this page is served under (e.g. "ja-jp"). */
  locale: string;
  /** URL-facing locale the *content* actually comes from (differs from `locale` for fallback pages). */
  contentLocale: string;
  sourcePath: string;
  /** GitHub edit URL for this source page, when configured. */
  editUrl?: string;
  /** Absolute path of the page's `.meta.ts` file, when one exists (spec §9.1, §39). */
  metadataPath?: string;
  isFallback: boolean;
  fallbackSource?: string;
  title: string;
  description?: string;
  html: string;
  headings: GeneratedHeading[];
  draft: boolean;
  hidden: boolean;
  /** Where `title` came from — tier 3-4 (filename/pageId) means the author never gave this page a real title (spec §17, `missing-title`). Internal. */
  titleSource: "metadata" | "heading" | "filename" | "pageId";
  /** Whether `pageId` was declared in `.meta.ts` or derived from the file path (spec §18, `generated-page-id`). Internal. */
  pageIdSource: "metadata" | "auto";
  /** Whether to render the page-level sidebar (`.meta.ts` `sidebar`, spec §16). Defaults to `true`. */
  sidebar: boolean;
  /** Whether to render a table of contents for this page (`.meta.ts` `tableOfContents`, spec §16). Defaults to `true`. */
  tableOfContents: boolean;
  /** Sort order among siblings in auto-generated navigation (spec §16, §27). Internal — not part of the public API. */
  order?: number;
  /** Numeric filename ordering prefix, when the page has one (ORDER-PREFIX §19 `filenameOrder`). Falls back below `order`. Internal. */
  filenameOrder?: number;
  /** Navigation-specific overrides from `.meta.ts` (`navigation.title`/`navigation.primary`, spec §16, §30). Internal. */
  navigation?: {
    title?: string;
    primary?: string[];
  };
  /** Classification facets from `.meta.ts` (spec §16.2). */
  taxonomy?: PageTaxonomy;
  /** Canonical ancestors: Collection > Section > Group (spec §39). Filled by the navigation engine. */
  hierarchy: PageHierarchyNode[];
  /** Breadcrumb trail incl. Site/Home and the page itself per theme config (spec §31). Filled by the navigation engine. */
  breadcrumbs: GeneratedBreadcrumb[];
  /** Canonical navigation position with prev/next (spec §30, §32). Absent for pages outside navigation. */
  navigationPosition?: GeneratedNavigationPosition;
  metadata: GeneratedMetadata;
}
