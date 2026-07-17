/**
 * A value that varies per locale, keyed by BCP 47 locale identifier
 * (e.g. `"en-US"`, `"ja-JP"`).
 *
 * @example
 * ```ts
 * const title: LocalizedValue<string> = {
 *   "en-US": "Developer Tools",
 *   "ja-JP": "開発者向けツール",
 * };
 * ```
 */
export type LocalizedValue<T> = Record<string, T>;

/** SEO overrides applied to every page in a collection (spec §11.2). */
export interface CollectionSeoConfig {
  /** Default Open Graph / social card image for pages in this collection. */
  image?: string;
  /** Exclude the whole collection from search-engine indexing. */
  noindex?: boolean;
}

/**
 * Metadata for a collection — a cohesive set of documentation for one
 * product, service, library, API, or technical domain (spec §7.2, §11).
 *
 * Defined in `collection.makit.ts` at the collection's root directory,
 * or imported explicitly from `makit.config.ts` (spec §13).
 */
export interface CollectionMetadata {
  /**
   * Site-wide unique collection identifier.
   *
   * Collections with the same `id` across locales are treated as
   * translations of the same collection (spec §12).
   */
  id: string;

  /** Display name of the collection. */
  title: string | LocalizedValue<string>;

  /** Description of the collection, shown on portal and collection tops. */
  description?: string | LocalizedValue<string>;

  /**
   * URL prefix excluding the locale prefix (e.g. `"/makit"`).
   *
   * Navigation hierarchy and URL hierarchy are independent (spec §5.6).
   */
  path?: string;

  /**
   * Markdown file used as the collection top page, relative to the
   * collection directory.
   *
   * @default "index.md"
   */
  index?: string;

  /** Icon asset path shown on portal and collection switcher entries. */
  icon?: string;

  /** Hide this collection from navigation, portal, and switcher UI. */
  hidden?: boolean;

  seo?: CollectionSeoConfig;
}

/**
 * Manual navigation definition for a collection (spec §14).
 *
 * Defined in `navigation.makit.ts` at the collection's root directory.
 * Its presence switches the collection to manual navigation (spec §25).
 */
export interface NavigationMetadata {
  items: NavigationNode[];
}

/**
 * A navigation element treating pages, sections, groups, collections,
 * and external links uniformly (spec §7.6, §14.2).
 */
export type NavigationNode =
  | NavigationPageNode
  | NavigationSectionNode
  | NavigationGroupNode
  | NavigationLinkNode
  | NavigationCollectionNode;

/** Navigation entry pointing at a page by its stable page ID. */
export interface NavigationPageNode {
  type: "page";

  /** The target page's `pageId` (spec §29). */
  page: string;

  /** Display title override; defaults to the page's resolved title. */
  title?: string;
  /** Exclude this entry from rendered navigation. */
  hidden?: boolean;
}

/**
 * A major division inside a collection, e.g. "Getting Started",
 * "Guides", "Reference" (spec §7.3).
 */
export interface NavigationSectionNode {
  type: "section";

  id?: string;
  title: string;

  /** Page ID that makes the section itself clickable. */
  page?: string;

  items: NavigationNode[];

  /** Whether the section can be collapsed in the sidebar. */
  collapsible?: boolean;
  /** Initial collapsed state (ancestors of the current page auto-expand). */
  collapsed?: boolean;
}

/**
 * A minor grouping inside a section — a logical node used purely for
 * organizing navigation (spec §7.4).
 */
export interface NavigationGroupNode {
  type: "group";

  id?: string;
  title?: string;

  items: NavigationNode[];

  /** Whether the group can be collapsed in the sidebar. */
  collapsible?: boolean;
  /** Initial collapsed state (ancestors of the current page auto-expand). */
  collapsed?: boolean;
}

/** Navigation entry pointing at an arbitrary URL. */
export interface NavigationLinkNode {
  type: "link";

  title: string;
  href: string;

  /** Render with external-link affordances and open in a new tab. */
  external?: boolean;
}

/** Navigation entry pointing at another collection's top page. */
export interface NavigationCollectionNode {
  type: "collection";

  /** The target collection's `id`. */
  collection: string;
  /** Display title override; defaults to the collection's title. */
  title?: string;
}

/**
 * Metadata for a section or group directory, used by automatic
 * navigation generation (spec §15).
 *
 * Defined in `category.makit.ts` inside the directory it describes.
 */
export interface CategoryMetadata {
  id?: string;

  title?: string | LocalizedValue<string>;

  /**
   * Whether this directory is a section (major division) or a group
   * (minor logical grouping).
   *
   * @default "section"
   */
  type?: "section" | "group";

  /** Sort key within the parent; lower values come first (spec §27). */
  order?: number;

  /** Exclude this directory's subtree from rendered navigation. */
  hidden?: boolean;

  /** Whether the node can be collapsed in the sidebar. */
  collapsible?: boolean;
  /** Initial collapsed state (ancestors of the current page auto-expand). */
  collapsed?: boolean;

  /**
   * Markdown file that makes this node clickable, relative to the
   * directory.
   */
  index?: string;
}

/** Classification facets for a page (spec §16.2). */
export interface PageTaxonomy {
  topics?: string[];
  products?: string[];
  audiences?: string[];
  tags?: string[];
}

/**
 * Metadata for a single Markdown page (spec §16).
 *
 * Defined in a `{filename}.meta.ts` file next to `{filename}.md`.
 * Pages without a `.meta.ts` fall back to the first H1 / filename
 * (spec §17, §18).
 */
export interface PageMetadata {
  /**
   * Stable page identifier shared across translations (spec §29).
   *
   * Pages with the same `id` in different locales are treated as
   * translations of one page. Duplicates within the same locale and
   * collection are an error.
   */
  id?: string;

  /** Page title; defaults to the Markdown's first H1 (spec §17). */
  title?: string;
  description?: string;

  /**
   * URL path segments overriding the file-path-derived slug
   * (spec §28.2). A string is treated as a single segment.
   */
  slug?: string | string[];

  /** Sort key within automatic navigation; lower values come first. */
  order?: number;

  /** Exclude from production builds (still rendered by `makit dev`). */
  draft?: boolean;
  /** Build the page but exclude it from navigation. */
  hidden?: boolean;

  /**
   * Show the collection sidebar on this page.
   *
   * @default true
   */
  sidebar?: boolean;
  /**
   * Show the in-page table of contents.
   *
   * @default true
   */
  tableOfContents?: boolean;

  layout?: string;

  canonical?: string;
  /** Open Graph / social card image. */
  image?: string;

  noindex?: boolean;
  nofollow?: boolean;

  navigation?: {
    /** Display title override used only in navigation. */
    title?: string;

    /**
     * Canonical navigation position when the same page is placed in
     * multiple navigation locations (spec §30), as a path of
     * section/group IDs.
     */
    primary?: string[];
  };

  taxonomy?: PageTaxonomy;
}
