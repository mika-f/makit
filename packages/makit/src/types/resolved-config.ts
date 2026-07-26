import type {
  BuildConfig,
  AnalyticsConfig,
  ChangelogDateStyle,
  CollectionNavigationConfig,
  CollectionsConfig,
  ExternalLinksConfig,
  FooterConfig,
  GitHubConfig,
  GlobalNavigationGroup,
  HeaderConfig,
  HomeSectionConfig,
  MakitCollectionFallbackBehavior,
  MakitColorScheme,
  MakitFallbackBehavior,
  MakitMessages,
  MakitMissingPageBehavior,
  MakitRadius,
  MakitRootBehavior,
  MakitFailOnCode,
  MakitWarningCode,
  NavigationGroup,
  NavigationMode,
  ShikiUnknownLanguageBehavior,
  UnifiedPluginEntry,
  UnorderedPosition,
} from "./config.js";
import type {
  GeneratedHeaderRule,
  GeneratedRedirect,
  ResolvedDeploymentConfig,
} from "./adapter.js";
import type { LocalizedValue } from "../metadata/types.js";
import type { ThemeManifest } from "./theme.js";
import type { ThemeSlotName } from "@natsuneko-laboratory/makit-runtime/slot-names";

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
  collectionFallback: {
    behavior: MakitCollectionFallbackBehavior;
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

/** A code-bearing warning produced while resolving the config (THEME §15.2). */
export interface ResolvedConfigDiagnostic {
  code: MakitWarningCode;
  message: string;
  sourcePath?: string;
}

/** A slot bound to a concrete module (THEME §7.4, §10.1). */
export interface ResolvedThemeSlot {
  /** The bare package specifier, when the slot lives in a package. */
  packageSpecifier?: string;
  /** Absolute path, when the slot lives in a file. */
  filePath?: string;
  /** Named export to import; `undefined` means the default export. */
  exportName?: string;
  /** Where the binding came from, for diagnostics (THEME §7.5). */
  origin: "config" | "dir";
  /** The specifier as written by the user, for diagnostics. */
  source: string;
}

/** A resolved `theme.extends` base theme (THEME §7.1, §9). */
export interface ResolvedThemeExtends {
  /** Import request for the generated app: a package name or an absolute path. */
  request: string;
  /** Absolute root directory of the theme (its package root, or the local directory). */
  root: string;
  /** Display name used in diagnostics (`manifest.name` when available). */
  name: string;
  manifest?: ThemeManifest;
}

export interface ResolvedThemeConfig {
  colorScheme: MakitColorScheme;
  accentColor?: string;
  radius: MakitRadius;
  breadcrumbs: {
    enabled: boolean;
    showHome: boolean;
    showCurrentPage: boolean;
  };
  codeTheme: { light: string; dark: string };
  /** Convention directory, relative to the project root; `false` when disabled. */
  dir: string | false;
  /** Base theme, when `theme.extends` is set. */
  extends?: ResolvedThemeExtends;
  /**
   * Slot bindings from `theme.components` and the convention directory.
   * Slots provided by `theme.extends` are not listed here — the generated app
   * spreads that theme's whole module namespace (THEME §10.1).
   */
  slots: Partial<Record<ThemeSlotName, ResolvedThemeSlot | false>>;
  /** Absolute paths of CSS files the base theme ships (THEME §13.2). */
  styles: string[];
  /** Absolute globs Tailwind must scan for the theme's class names (THEME §13.1). */
  tailwindSources: string[];
  /** Package roots that must be inside the Turbopack root (THEME §17). */
  packageRoots: string[];
  /** Warnings raised while resolving the theme (THEME §15.2). */
  diagnostics: ResolvedConfigDiagnostic[];
}

export interface ResolvedSeoConfig {
  titleTemplate: string;
  defaultImage?: string;
}

export interface ResolvedSitemapConfig {
  enabled: boolean;
  includeFallbackPages: boolean;
}

export interface ResolvedLlmsConfig {
  enabled: boolean;
}

export interface ResolvedGitHubConfig extends Required<GitHubConfig> {}

/** Site-wide changelog defaults with every option resolved (CHANGELOG §13, §14.1). */
export interface ResolvedChangelogConfig {
  enabled: boolean;
  apiBaseUrl: string;
  /** Resolved from config, then `MAKIT_GITHUB_TOKEN`, then `GITHUB_TOKEN`. */
  token?: string;
  cacheTtl: number;
  offline: boolean;
  limit: number;
  prereleases: boolean;
  headingLevel: number;
  dateStyle: ChangelogDateStyle;
  labels: {
    prerelease: string | LocalizedValue<string>;
    empty: string | LocalizedValue<string>;
  };
}

export interface ResolvedBuildConfig extends Required<BuildConfig> {}

export interface ResolvedDevConfig {
  port: number;
  host: string;
  open: boolean;
  silentNext: boolean;
}

export interface ResolvedPreviewConfig {
  port: number;
  host: string;
  open: boolean;
}

export interface ResolvedHomeConfig {
  /** Undefined means "derive from the collection layout" (spec §33). */
  layout?: "page" | "portal";
  page?: string;
  featuredCollections: string[];
  sections: HomeSectionConfig[];
}

export interface ResolvedNavigationConfig {
  mode: NavigationMode;
  includeFallbackPages: boolean;
  locales: Record<string, NavigationGroup[]>;
  collections: Record<string, CollectionNavigationConfig>;
  global: GlobalNavigationGroup[];
  pagination: {
    enabled: boolean;
    crossSection: boolean;
  };
  auto: {
    numericPrefixes: boolean;
    routeGroups: "url" | "flatten" | false;
    unorderedPosition: UnorderedPosition;
  };
}

export interface ResolvedValidationConfig {
  strict: boolean;
  disallowFrontMatter: boolean;
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
  /** Raw collections input; resolved separately (async) into `ResolvedCollection[]`. */
  collections?: CollectionsConfig;
  home: ResolvedHomeConfig;
  i18n: ResolvedI18nConfig;
  navigation: ResolvedNavigationConfig;
  header: HeaderConfig;
  footer: FooterConfig;
  theme: ResolvedThemeConfig;
  markdown: ResolvedMarkdownConfig;
  styles: string[];
  seo: ResolvedSeoConfig;
  analytics: AnalyticsConfig;
  sitemap: ResolvedSitemapConfig;
  llms: ResolvedLlmsConfig;
  github?: ResolvedGitHubConfig;
  changelog: ResolvedChangelogConfig;
  build: ResolvedBuildConfig;
  dev: ResolvedDevConfig;
  preview: ResolvedPreviewConfig;
  validation: ResolvedValidationConfig;
  deployment: ResolvedDeploymentConfig;
  redirects: GeneratedRedirect[];
  headers: GeneratedHeaderRule[];
  experimental: Record<string, unknown>;
}
