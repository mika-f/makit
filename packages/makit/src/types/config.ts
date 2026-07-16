export interface MakitConfig {
  title: string;
  description?: string;
  lang?: string;
  siteUrl?: string;
  sourceDir?: string;
  publicDir?: string;
  outDir?: string;
  basePath?: string;
  i18n?: MakitI18nConfig;
  navigation?: NavigationConfig;
  header?: HeaderConfig;
  footer?: FooterConfig;
  theme?: ThemeConfig;
  markdown?: MarkdownConfig;
  styles?: string[];
  seo?: SeoConfig;
  sitemap?: SitemapConfig;
  build?: BuildConfig;
  dev?: DevConfig;
  preview?: PreviewConfig;
  validation?: ValidationConfig;
  experimental?: ExperimentalConfig;
}

// #region i18n

export interface MakitLocaleConfig {
  locale: string;
  label?: string;
  lang?: string;
  dir?: "ltr" | "rtl";
  sourceDir?: string;
}

export type MakitFallbackBehavior = "render" | "redirect" | "not-found";

export interface MakitLocaleFallbackConfig {
  enabled?: boolean;
  behavior?: MakitFallbackBehavior;
  showNotice?: boolean;
}

export interface MakitMessages {
  fallbackNotice: string;
}

export type MakitRootBehavior = "default" | "detect" | "select";

export type MakitMissingPageBehavior = "fallback" | "locale-root" | "disabled";

export interface MakitI18nConfig {
  defaultLocale: string;
  locales: MakitLocaleConfig[];
  fallback?: boolean | MakitLocaleFallbackConfig;
  root?: {
    behavior?: MakitRootBehavior;
    locale?: string;
  };
  localeSwitcher?: {
    missingPage?: MakitMissingPageBehavior;
  };
  messages?: Record<string, Partial<MakitMessages>>;
}

// #endregion

// #region navigation

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

export type NavigationMode = "auto" | "manual";

export interface NavigationConfig {
  mode?: NavigationMode;
  includeFallbackPages?: boolean;
  locales?: Record<string, NavigationGroup[]>;
}

// #endregion

// #region header / footer

export interface HeaderLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface HeaderConfig {
  logo?: string;
  title?: string;
  links?: HeaderLink[];
}

export interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterConfig {
  copyright?: string;
  links?: FooterLink[];
}

// #endregion

// #region theme

export type MakitColorScheme = "light" | "dark" | "system";

export type MakitRadius = "none" | "small" | "medium" | "large";

export interface ThemeConfig {
  colorScheme?: MakitColorScheme;
  accentColor?: string;
  radius?: MakitRadius;
  codeTheme?:
    | string
    | {
        light: string;
        dark: string;
      };
}

// #endregion

// #region markdown

/** A remark/rehype plugin reference: the plugin itself, or a `[plugin, options]` tuple. */
export type UnifiedPluginEntry = unknown;

export interface ExternalLinksConfig {
  target?: "_blank" | "_self" | "_parent" | "_top";
  rel?: string;
}

export interface CodeBlockConfig {
  copyButton?: boolean;
  lineNumbers?: boolean;
}

export type ShikiUnknownLanguageBehavior = "error" | "warning" | "plain-text";

export interface ShikiDualTheme {
  light: string;
  dark: string;
}

export interface ShikiConfig {
  theme?: string;
  themes?: ShikiDualTheme;
  languages?: string[];
  unknownLanguage?: ShikiUnknownLanguageBehavior;
}

export interface TableOfContentsConfig {
  minDepth?: number;
  maxDepth?: number;
}

export interface MarkdownConfig {
  gfm?: boolean;
  headingIds?: boolean;
  allowDangerousHtml?: boolean;
  externalLinks?: ExternalLinksConfig;
  code?: CodeBlockConfig;
  shiki?: ShikiConfig;
  tableOfContents?: TableOfContentsConfig;
  remarkPlugins?: UnifiedPluginEntry[];
  rehypePlugins?: UnifiedPluginEntry[];
}

// #endregion

// #region seo / sitemap

export interface SeoConfig {
  titleTemplate?: string;
  defaultImage?: string;
}

export interface SitemapConfig {
  enabled?: boolean;
  includeFallbackPages?: boolean;
}

// #endregion

// #region build / dev / preview

export interface BuildConfig {
  clean?: boolean;
  trailingSlash?: boolean;
}

export interface DevConfig {
  port?: number;
  host?: string;
  open?: boolean;
}

export interface PreviewConfig {
  port?: number;
  host?: string;
  open?: boolean;
}

// #endregion

// #region validation

/**
 * Diagnostic codes that are warnings by default (spec §31.2).
 * `validation.failOn` promotes any of these to a build-stopping error.
 */
export type MakitWarningCode =
  | "missing-title"
  | "missing-translation"
  | "unknown-code-language"
  | "page-not-in-navigation"
  | "broken-link"
  | "missing-anchor"
  | "missing-site-url"
  | "missing-og-image"
  | "default-locale-only-page"
  | "translation-only-page"
  | "too-many-fallback-pages";

/**
 * Codes accepted by `validation.failOn`. In addition to the warnings above,
 * this also accepts the codes that are already build-stopping errors by
 * default (spec §31.1) — listing one there is redundant but harmless, and
 * the spec's own example config (§35) does exactly that.
 */
export type MakitFailOnCode = MakitWarningCode | "duplicate-route" | "duplicate-page-id";

export interface ValidationConfig {
  strict?: boolean;
  failOn?: MakitFailOnCode[];
}

// #endregion

// #region experimental

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ExperimentalConfig {
  [key: string]: unknown;
}

// #endregion
