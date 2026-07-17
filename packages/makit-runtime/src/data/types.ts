// Mirrors the JSON shapes `makit`'s core writes to `.makit/generated/` (spec §8.3).
// Duplicated here (rather than imported from the `makit` package) to keep
// makit-runtime decoupled from Core — the JSON wire format is the only
// contract between them.

export interface GeneratedHeading {
  id: string;
  depth: number;
  text: string;
}

/** A compact, precomputed page record consumed by the client-side search dialog. */
export interface SearchEntry {
  pageId: string;
  title: string;
  route: string;
  locale: string;
  headings: string[];
  content: string;
}

export interface GeneratedAlternate {
  urlLocale: string;
  hreflang: string;
  href: string;
}

export interface GeneratedMetadata {
  canonical?: string;
  noindex: boolean;
  nofollow: boolean;
  image?: string;
  alternates: GeneratedAlternate[];
}

export interface PageTaxonomy {
  topics?: string[];
  products?: string[];
  audiences?: string[];
  tags?: string[];
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
  collectionId: string;
  route: string;
  segments: string[];
  locale: string;
  contentLocale: string;
  sourcePath: string;
  metadataPath?: string;
  isFallback: boolean;
  fallbackSource?: string;
  title: string;
  description?: string;
  html: string;
  headings: GeneratedHeading[];
  draft: boolean;
  hidden: boolean;
  titleSource: "metadata" | "heading" | "filename" | "pageId";
  pageIdSource: "metadata" | "auto";
  sidebar: boolean;
  tableOfContents: boolean;
  order?: number;
  navigation?: {
    title?: string;
    primary?: string[];
  };
  taxonomy?: PageTaxonomy;
  /** Canonical ancestors: Collection > Section > Group (spec §39). */
  hierarchy: PageHierarchyNode[];
  /** Breadcrumb trail incl. Site/Home and the page itself per theme config (spec §31). */
  breadcrumbs: GeneratedBreadcrumb[];
  /** Canonical navigation position with prev/next (spec §30, §32). Absent for pages outside navigation. */
  navigationPosition?: GeneratedNavigationPosition;
  metadata: GeneratedMetadata;
}

/** One entry of `indexes/page-map.json`: `pageMap[locale][collectionId][pageId]`. */
export interface PageMapEntry {
  route: string;
  segments: string[];
  title: string;
  draft: boolean;
  hidden: boolean;
  isFallback: boolean;
}

/** The per-locale slice of the page map. */
export type LocalePageMap = Record<string, Record<string, PageMapEntry>>;

/** One entry of `indexes/route-map.json`: `routeMap[locale][joinedSegments]`. */
export type RouteMapEntry =
  | { kind: "page"; collectionId: string; pageId: string }
  /** The synthesized site home (spec §33.2) — see `home/{locale}.json`. */
  | { kind: "portal"; route: string };

export type LocaleRouteMap = Record<string, RouteMapEntry>;

/** One card in a synthesized portal home (spec §33.2). */
export interface PortalCollectionCard {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  href: string;
}

/** `home/{locale}.json` — the resolved payload for a synthesized portal home. */
export interface PortalHomeData {
  featuredCollections: PortalCollectionCard[];
  sections: { title?: string; collections: PortalCollectionCard[] }[];
}

/** One entry of `collections.json`. */
export interface CollectionData {
  id: string;
  pathSegments: string[];
  index: string;
  icon?: string;
  hidden: boolean;
  implicit: boolean;
  locales: Record<
    string,
    {
      title: string;
      description?: string;
      rootRoute: string;
    }
  >;
}

/** `navigation/{locale}/global.json` — collection refs already resolved to hrefs. */
export interface GlobalNavigationItem {
  title: string;
  href?: string;
  collection?: string;
  external?: boolean;
  items?: GlobalNavigationItem[];
}

export interface GlobalNavigationGroup {
  title?: string;
  items: GlobalNavigationItem[];
}

export interface HeaderLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface HeaderData {
  logo?: string;
  title?: string;
  links?: HeaderLink[];
}

export interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterData {
  copyright?: string;
  links?: FooterLink[];
}

export type ColorScheme = "light" | "dark" | "system";
export type Radius = "none" | "small" | "medium" | "large";

export interface ThemeData {
  colorScheme: ColorScheme;
  accentColor?: string;
  radius: Radius;
  codeTheme: { light: string; dark: string };
}

export interface SeoData {
  titleTemplate: string;
  defaultImage?: string;
}

export interface HomeData {
  layout?: "page" | "portal";
  page?: string;
  featuredCollections: string[];
  sections: { title?: string | Record<string, string>; collections: string[] }[];
}

export interface SiteData {
  title: string;
  description?: string;
  lang: string;
  siteUrl?: string;
  basePath: string;
  home: HomeData;
  header: HeaderData;
  footer: FooterData;
  theme: ThemeData;
  seo: SeoData;
  styles: string[];
  navigation: {
    pagination: { enabled: boolean; crossSection: boolean };
  };
  markdown: {
    tableOfContents: { minDepth: number; maxDepth: number };
    code: { copyButton: boolean; lineNumbers: boolean };
  };
}

export interface LocaleData {
  locale: string;
  urlLocale: string;
  label: string;
  lang: string;
  dir: "ltr" | "rtl";
  sourceDir: string;
}

export type FallbackBehavior = "render" | "redirect" | "not-found";
export type CollectionFallbackBehavior = "render" | "redirect" | "hidden" | "not-found";
export type RootBehavior = "default" | "detect" | "select";
export type MissingPageBehavior = "fallback" | "locale-root" | "disabled";

export interface I18nData {
  enabled: boolean;
  defaultLocale: string;
  locales: LocaleData[];
  fallback: {
    enabled: boolean;
    behavior: FallbackBehavior;
    showNotice: boolean;
  };
  collectionFallback: {
    behavior: CollectionFallbackBehavior;
  };
  root: {
    behavior: RootBehavior;
    locale?: string;
  };
  localeSwitcher: {
    missingPage: MissingPageBehavior;
  };
  messages: Record<string, { fallbackNotice: string; home: string }>;
}

/**
 * The resolved navigation tree written to `navigation/{locale}/{collection}.json`
 * (spec §14, §25, §27). All page/collection references are already resolved
 * to concrete titles and hrefs.
 */
export type ResolvedNavNode = ResolvedNavPageNode | ResolvedNavContainerNode | ResolvedNavLinkNode;

export interface ResolvedNavPageNode {
  type: "page";
  pageId: string;
  title: string;
  href: string;
}

/** A section (major division) or group (logical grouping) — spec §7.3-7.4. */
export interface ResolvedNavContainerNode {
  type: "section" | "group";
  /** Used for `navigation.primary` matching (spec §30); auto mode uses the directory name. */
  id?: string;
  title?: string;
  /** Set when the container itself is clickable (spec §15.2 `index`, §14.2 `page`). */
  pageId?: string;
  href?: string;
  collapsible: boolean;
  collapsed: boolean;
  items: ResolvedNavNode[];
}

export interface ResolvedNavLinkNode {
  type: "link";
  title: string;
  href: string;
  external?: boolean;
}

export interface RootLocaleOption {
  locale: string;
  urlLocale: string;
  label: string;
  href: string;
}
