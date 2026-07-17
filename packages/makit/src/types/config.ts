import type { CollectionMetadata, LocalizedValue, NavigationNode } from "../metadata/types.js";
import type { DeploymentConfig, GeneratedHeaderRule, GeneratedRedirect } from "./adapter.js";

export interface MakitConfig {
  title: string;
  description?: string;
  lang?: string;
  siteUrl?: string;
  sourceDir?: string;
  publicDir?: string;
  outDir?: string;
  basePath?: string;
  /**
   * Collections (spec §12-13): an explicit array of imported
   * `defineCollection` values, or `{ mode: "discover" }` to scan each
   * locale's sourceDir for `collection.makit.ts` files. Omit for a
   * single-collection site (an implicit collection is created, spec §48.1).
   */
  collections?: CollectionsConfig;
  home?: HomeConfig;
  i18n?: MakitI18nConfig;
  navigation?: NavigationConfig;
  header?: HeaderConfig;
  footer?: FooterConfig;
  theme?: ThemeConfig;
  markdown?: MarkdownConfig;
  styles?: string[];
  seo?: SeoConfig;
  sitemap?: SitemapConfig;
  /** Generate LLM-oriented Markdown endpoints plus llms.txt files. */
  llms?: LlmsConfig;
  /** Source repository used by the page-level "Edit on GitHub" link. */
  github?: GitHubConfig;
  build?: BuildConfig;
  dev?: DevConfig;
  preview?: PreviewConfig;
  validation?: ValidationConfig;
  deployment?: DeploymentConfig;
  redirects?: Array<Omit<GeneratedRedirect, "source"> & { source?: GeneratedRedirect["source"] }>;
  headers?: GeneratedHeaderRule[];
  experimental?: ExperimentalConfig;
}

// #region collections / home

export type CollectionsConfig = CollectionMetadata[] | { mode: "discover" };

export interface HomeSectionConfig {
  title?: string | LocalizedValue<string>;
  collections: string[];
}

/** Site top page (spec §33): a Markdown page or a portal listing collections. */
export interface HomeConfig {
  layout?: "page" | "portal";
  /** Page ID used as the site top when `layout` is `"page"`. */
  page?: string;
  featuredCollections?: string[];
  sections?: HomeSectionConfig[];
}

// #endregion

// #region i18n

export interface MakitLocaleConfig {
  locale: string;
  label?: string;
  lang?: string;
  dir?: "ltr" | "rtl";
  sourceDir?: string;
}

export type MakitFallbackBehavior = "render" | "redirect" | "not-found";

/** Behavior when an entire collection is missing in a locale (spec §35.5). */
export type MakitCollectionFallbackBehavior = "render" | "redirect" | "hidden" | "not-found";

export interface MakitLocaleFallbackConfig {
  enabled?: boolean;
  behavior?: MakitFallbackBehavior;
  showNotice?: boolean;
}

export interface MakitMessages {
  fallbackNotice: string;
  /** The "Home" breadcrumb label (spec §31). */
  home: string;
}

export type MakitRootBehavior = "default" | "detect" | "select";

export type MakitMissingPageBehavior = "fallback" | "locale-root" | "disabled";

export interface MakitI18nConfig {
  defaultLocale: string;
  locales: MakitLocaleConfig[];
  fallback?: boolean | MakitLocaleFallbackConfig;
  collectionFallback?: {
    behavior?: MakitCollectionFallbackBehavior;
  };
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

/** A top-level group in the site-wide global navigation (spec §26). */
export interface GlobalNavigationGroup {
  title?: string;
  items: GlobalNavigationItem[];
}

/** `href` and `collection` are mutually exclusive (spec §26). */
export interface GlobalNavigationItem {
  title: string;
  href?: string;
  /** Target collection ID; resolves to the collection's top page per locale. */
  collection?: string;
  external?: boolean;
  items?: GlobalNavigationItem[];
}

export interface PaginationConfig {
  enabled?: boolean;
  /** Whether prev/next links may cross section boundaries (spec §32). */
  crossSection?: boolean;
}

/**
 * Per-collection navigation source (spec §25). Explicit config here has the
 * highest priority; a `navigation.makit.ts` in the collection directory is
 * the second; automatic generation is the fallback. Configuring `manual`
 * here while a `navigation.makit.ts` also exists is a conflict error.
 */
export type CollectionNavigationConfig =
  | {
      mode: "auto";
      includeFallbackPages?: boolean;
    }
  | {
      mode: "manual";
      items: NavigationNode[];
    };

/** Where items without a numeric ordering prefix are placed among prefixed siblings (spec §9, ORDER-PREFIX §9). */
export type UnorderedPosition = "first" | "last";

/** Numeric filename/directory ordering prefix behavior for automatic navigation (ORDER-PREFIX §18). */
export interface AutoNavigationConfig {
  /**
   * Whether a leading `NN-` on filenames/directories controls automatic
   * navigation order (ORDER-PREFIX §2, §18).
   *
   * @default true
   */
  numericPrefixes?: boolean;
  /**
   * Where items without a numeric prefix are placed relative to prefixed
   * siblings (ORDER-PREFIX §9).
   *
   * @default "last"
   */
  unorderedPosition?: UnorderedPosition;
}

export interface NavigationConfig {
  mode?: NavigationMode;
  includeFallbackPages?: boolean;
  locales?: Record<string, NavigationGroup[]>;
  /** Explicit per-collection navigation, keyed by collection ID (spec §25). */
  collections?: Record<string, CollectionNavigationConfig>;
  global?: GlobalNavigationGroup[];
  pagination?: PaginationConfig;
  /** Numeric filename/directory ordering prefix behavior (ORDER-PREFIX §18). */
  auto?: AutoNavigationConfig;
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
  /** Alternate logo displayed while the site is using its dark theme. */
  logoDark?: string;
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

export interface BreadcrumbsConfig {
  enabled?: boolean;
  showHome?: boolean;
  showCurrentPage?: boolean;
}

export interface ThemeConfig {
  colorScheme?: MakitColorScheme;
  accentColor?: string;
  radius?: MakitRadius;
  breadcrumbs?: BreadcrumbsConfig;
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

// #region source repository

export interface GitHubConfig {
  /** GitHub repository in `owner/repository` form. */
  repository: string;
  /** Branch containing the documentation source. @default "main" */
  branch?: string;
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

/** Controls LLM-oriented static output. Disabled by default. */
export interface LlmsConfig {
  enabled?: boolean;
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
  /** Suppress `next dev`'s own output, keeping makit's logs. */
  silentNext?: boolean;
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
  | "missing-page-metadata"
  | "generated-page-id"
  | "multiple-placement-without-primary"
  | "deep-navigation"
  | "empty-section"
  | "empty-group"
  | "missing-translation"
  | "unknown-code-language"
  | "page-not-in-navigation"
  | "broken-link"
  | "missing-anchor"
  | "missing-site-url"
  | "missing-og-image"
  | "default-locale-only-page"
  | "translation-only-page"
  | "too-many-fallback-pages"
  | "collection-fallback"
  | "env-var-in-metadata"
  | "out-of-project-import"
  | "slow-metadata-eval"
  | "front-matter-too-deep"
  | "front-matter-invalid-value"
  | "duplicate-navigation-order";

/**
 * Codes accepted by `validation.failOn`. In addition to the warnings above,
 * this also accepts the codes that are already build-stopping errors by
 * default (spec §31.1) — listing one there is redundant but harmless, and
 * the spec's own example config (§35) does exactly that.
 */
export type MakitFailOnCode = MakitWarningCode | "duplicate-route" | "duplicate-page-id";

export interface ValidationConfig {
  strict?: boolean;
  /**
   * Reject a leading YAML `---` block in Markdown instead of parsing it.
   *
   * When `false` (the default), a leading front matter block is treated as
   * a lightweight, flat (non-nested) alternative to `{page}.meta.ts` —
   * useful for pages that only need a couple of scalar overrides (e.g.
   * `title`, `order`). Nested fields (`navigation`, `taxonomy`) and fields
   * with object/array-of-object values are not supported this way; such a
   * field is dropped and reported as a `front-matter-too-deep` warning
   * (promote it to a build error via `failOn`/`strict`) rather than failing
   * the whole page. A page may not define both a `.meta.ts` file and
   * non-empty front matter — pick one.
   *
   * Set to `true` to forbid front matter entirely and force all page
   * metadata through `.meta.ts`.
   *
   * @default false
   */
  disallowFrontMatter?: boolean;
  failOn?: MakitFailOnCode[];
}

// #endregion

// #region experimental

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ExperimentalConfig {
  [key: string]: unknown;
}

// #endregion
