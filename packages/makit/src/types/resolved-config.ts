import type {
  BuildConfig,
  ExternalLinksConfig,
  FooterConfig,
  HeaderConfig,
  MakitColorScheme,
  MakitFallbackBehavior,
  MakitMessages,
  MakitMissingPageBehavior,
  MakitRadius,
  MakitRootBehavior,
  MakitFailOnCode,
  NavigationConfig,
  ShikiUnknownLanguageBehavior,
  UnifiedPluginEntry,
} from "./config.js";

/** A locale as declared in `makit.config.ts`, resolved with all defaults applied. */
export interface ResolvedLocaleConfig {
  /** Original BCP-47 locale as declared in config (e.g. "ja-JP"). */
  locale: string;
  /** Lowercased form used in URLs and generated directory names (e.g. "ja-jp"). */
  urlLocale: string;
  label: string;
  lang: string;
  dir: "ltr" | "rtl";
  sourceDir: string;
}

export interface ResolvedI18nConfig {
  /** False when the user did not configure `i18n` — the site is treated as a single implicit locale. */
  enabled: boolean;
  defaultLocale: string;
  locales: ResolvedLocaleConfig[];
  fallback: {
    enabled: boolean;
    behavior: MakitFallbackBehavior;
    showNotice: boolean;
  };
  root: {
    behavior: MakitRootBehavior;
    locale?: string;
  };
  localeSwitcher: {
    missingPage: MakitMissingPageBehavior;
  };
  messages: Record<string, MakitMessages>;
}

export interface ResolvedShikiConfig {
  themes: { light: string; dark: string };
  languages?: string[];
  unknownLanguage: ShikiUnknownLanguageBehavior;
}

export interface ResolvedMarkdownConfig {
  gfm: boolean;
  headingIds: boolean;
  allowDangerousHtml: boolean;
  externalLinks: Required<ExternalLinksConfig>;
  code: { copyButton: boolean; lineNumbers: boolean };
  shiki: ResolvedShikiConfig;
  tableOfContents: { minDepth: number; maxDepth: number };
  remarkPlugins: UnifiedPluginEntry[];
  rehypePlugins: UnifiedPluginEntry[];
}

export interface ResolvedThemeConfig {
  colorScheme: MakitColorScheme;
  accentColor?: string;
  radius: MakitRadius;
  codeTheme: { light: string; dark: string };
}

export interface ResolvedSeoConfig {
  titleTemplate: string;
  defaultImage?: string;
}

export interface ResolvedSitemapConfig {
  enabled: boolean;
  includeFallbackPages: boolean;
}

export interface ResolvedBuildConfig extends Required<BuildConfig> {}

export interface ResolvedDevConfig {
  port: number;
  host: string;
  open: boolean;
}

export interface ResolvedPreviewConfig {
  port: number;
  host: string;
  open: boolean;
}

export interface ResolvedValidationConfig {
  strict: boolean;
  failOn: MakitFailOnCode[];
}

/**
 * Fully-resolved configuration: every optional field from `MakitConfig` has
 * been given a default value and every path/locale has been normalized.
 * This is the internal representation used by Core, never exposed to users.
 */
export interface ResolvedConfig {
  /** Absolute path to the project root (the directory containing the config file). */
  root: string;
  /** Absolute path to the loaded config file. */
  configPath: string;
  title: string;
  description?: string;
  lang: string;
  siteUrl?: string;
  sourceDir: string;
  publicDir: string;
  outDir: string;
  basePath: string;
  i18n: ResolvedI18nConfig;
  navigation: Required<NavigationConfig>;
  header: HeaderConfig;
  footer: FooterConfig;
  theme: ResolvedThemeConfig;
  markdown: ResolvedMarkdownConfig;
  styles: string[];
  seo: ResolvedSeoConfig;
  sitemap: ResolvedSitemapConfig;
  build: ResolvedBuildConfig;
  dev: ResolvedDevConfig;
  preview: ResolvedPreviewConfig;
  validation: ResolvedValidationConfig;
  experimental: Record<string, unknown>;
}
