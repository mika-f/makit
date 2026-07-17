// Mirrors the JSON shapes `makit`'s core writes to `.makit/generated/` (spec §8.3).
// Duplicated here (rather than imported from the `makit` package) to keep
// makit-runtime decoupled from Core — the JSON wire format is the only
// contract between them.

export interface GeneratedHeading {
  id: string;
  depth: number;
  text: string;
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
  sidebar: boolean;
  tableOfContents: boolean;
  order?: number;
  navigation?: {
    title?: string;
    primary?: string[];
  };
  taxonomy?: PageTaxonomy;
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
export interface RouteMapEntry {
  collectionId: string;
  pageId: string;
  kind: "page";
}

export type LocaleRouteMap = Record<string, RouteMapEntry>;

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
  messages: Record<string, { fallbackNotice: string }>;
}

export interface NavigationItem {
  title: string;
  href?: string;
  external?: boolean;
  items?: NavigationItem[];
}

export interface NavigationGroup {
  title?: string;
  items: NavigationItem[];
}

export interface RootLocaleOption {
  locale: string;
  urlLocale: string;
  label: string;
  href: string;
}
