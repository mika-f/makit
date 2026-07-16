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

export interface GeneratedPage {
  pageId: string;
  route: string;
  segments: string[];
  locale: string;
  contentLocale: string;
  sourcePath: string;
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
    group?: string;
  };
  metadata: GeneratedMetadata;
}

export interface ManifestEntry {
  pageId: string;
  route: string;
  segments: string[];
  locale: string;
  title: string;
  draft: boolean;
  hidden: boolean;
}

export interface Manifest {
  generatedAt: string;
  pages: ManifestEntry[];
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

export interface SiteData {
  title: string;
  description?: string;
  lang: string;
  siteUrl?: string;
  basePath: string;
  header: HeaderData;
  footer: FooterData;
  theme: ThemeData;
  seo: SeoData;
  styles: string[];
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
