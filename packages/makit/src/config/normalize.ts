import { MakitError } from "../core/errors.js";
import type { MakitMessages } from "../types/config.js";
import type {
  ResolvedConfig,
  ResolvedI18nConfig,
  ResolvedLocaleConfig,
} from "../types/resolved-config.js";
import {
  DEFAULT_BASE_PATH,
  DEFAULT_DEV_HOST,
  DEFAULT_DEV_PORT,
  DEFAULT_FALLBACK_NOTICE,
  DEFAULT_LANG,
  DEFAULT_OUT_DIR,
  DEFAULT_PUBLIC_DIR,
  DEFAULT_SHIKI_THEME_DARK,
  DEFAULT_SHIKI_THEME_LIGHT,
  DEFAULT_SOURCE_DIR,
} from "./defaults.js";
import type { MakitConfigParsed } from "./schema.js";

/** Normalizes `basePath`: leading `/`, no trailing `/`, `""` for the root. */
export function normalizeBasePath(basePath: string | undefined): string {
  if (!basePath || basePath === "/") return DEFAULT_BASE_PATH;
  let result = basePath.startsWith("/") ? basePath : `/${basePath}`;
  while (result.length > 1 && result.endsWith("/")) {
    result = result.slice(0, -1);
  }
  return result;
}

/** Normalizes a BCP-47 locale tag to the lowercase form used in URLs (e.g. `ja-JP` -> `ja-jp`). */
export function normalizeLocaleForUrl(locale: string): string {
  return locale.toLowerCase();
}

interface ResolveContext {
  root: string;
  configPath: string;
}

function resolveI18n(parsed: MakitConfigParsed, topLevelLang: string): ResolvedI18nConfig {
  const i18n = parsed.i18n;

  if (!i18n) {
    // Spec §8.2 / §16: even without i18n, the site is treated internally as
    // a single implicit locale so downstream code never has to branch on
    // whether i18n is enabled.
    const singleLocale: ResolvedLocaleConfig = {
      locale: topLevelLang,
      urlLocale: normalizeLocaleForUrl(topLevelLang),
      label: topLevelLang,
      lang: topLevelLang,
      dir: "ltr",
      sourceDir: parsed.sourceDir ?? DEFAULT_SOURCE_DIR,
    };

    return {
      enabled: false,
      defaultLocale: topLevelLang,
      locales: [singleLocale],
      fallback: { enabled: false, behavior: "render", showNotice: false },
      root: { behavior: "default" },
      localeSwitcher: { missingPage: "disabled" },
      messages: {},
    };
  }

  const sourceDir = parsed.sourceDir ?? DEFAULT_SOURCE_DIR;

  const locales: ResolvedLocaleConfig[] = i18n.locales.map((locale) => ({
    locale: locale.locale,
    urlLocale: normalizeLocaleForUrl(locale.locale),
    label: locale.label ?? locale.locale,
    lang: locale.lang ?? locale.locale,
    dir: locale.dir ?? "ltr",
    sourceDir: locale.sourceDir ?? `${sourceDir}/${normalizeLocaleForUrl(locale.locale)}`,
  }));

  const seenUrlLocales = new Set<string>();
  for (const locale of locales) {
    if (seenUrlLocales.has(locale.urlLocale)) {
      throw new MakitError(
        "duplicate-locale",
        `Duplicate locale after normalization: "${locale.urlLocale}" (from "${locale.locale}"). ` +
          "Locales must be unique once normalized to lowercase for URLs.",
      );
    }
    seenUrlLocales.add(locale.urlLocale);
  }

  if (!locales.some((locale) => locale.locale === i18n.defaultLocale)) {
    throw new MakitError(
      "default-locale-not-found",
      `i18n.defaultLocale "${i18n.defaultLocale}" must match one of the configured i18n.locales: ` +
        locales.map((locale) => locale.locale).join(", "),
    );
  }

  const fallbackRaw = i18n.fallback;
  const fallback =
    fallbackRaw === false
      ? { enabled: false, behavior: "render" as const, showNotice: true }
      : fallbackRaw === true || fallbackRaw === undefined
        ? { enabled: true, behavior: "render" as const, showNotice: true }
        : {
            enabled: fallbackRaw.enabled ?? true,
            behavior: fallbackRaw.behavior ?? "render",
            showNotice: fallbackRaw.showNotice ?? true,
          };

  const messages: Record<string, MakitMessages> = {};
  for (const locale of locales) {
    const override = i18n.messages?.[locale.locale] ?? i18n.messages?.[locale.urlLocale];
    messages[locale.urlLocale] = {
      fallbackNotice: override?.fallbackNotice ?? DEFAULT_FALLBACK_NOTICE,
    };
  }

  return {
    enabled: true,
    defaultLocale: i18n.defaultLocale,
    locales,
    fallback,
    // Spec §16.10 lists three root behaviors without naming a default;
    // "default" (a static redirect to defaultLocale) is chosen as the
    // zero-JS baseline.
    root: {
      behavior: i18n.root?.behavior ?? "default",
      locale: i18n.root?.locale,
    },
    localeSwitcher: {
      missingPage: i18n.localeSwitcher?.missingPage ?? "fallback",
    },
    messages,
  };
}

export function resolveConfig(parsed: MakitConfigParsed, ctx: ResolveContext): ResolvedConfig {
  const lang = parsed.lang ?? DEFAULT_LANG;
  const shikiThemes = parsed.markdown?.shiki?.theme
    ? { light: parsed.markdown.shiki.theme, dark: parsed.markdown.shiki.theme }
    : (parsed.markdown?.shiki?.themes ?? {
        light: DEFAULT_SHIKI_THEME_LIGHT,
        dark: DEFAULT_SHIKI_THEME_DARK,
      });

  return {
    root: ctx.root,
    configPath: ctx.configPath,
    title: parsed.title,
    description: parsed.description,
    lang,
    siteUrl: parsed.siteUrl,
    sourceDir: parsed.sourceDir ?? DEFAULT_SOURCE_DIR,
    publicDir: parsed.publicDir ?? DEFAULT_PUBLIC_DIR,
    outDir: parsed.outDir ?? DEFAULT_OUT_DIR,
    basePath: normalizeBasePath(parsed.basePath),
    i18n: resolveI18n(parsed, lang),
    navigation: {
      mode: parsed.navigation?.mode ?? "auto",
      includeFallbackPages: parsed.navigation?.includeFallbackPages ?? true,
      locales: parsed.navigation?.locales ?? {},
    },
    header: parsed.header ?? {},
    footer: parsed.footer ?? {},
    theme: {
      colorScheme: parsed.theme?.colorScheme ?? "system",
      accentColor: parsed.theme?.accentColor,
      radius: parsed.theme?.radius ?? "medium",
      codeTheme:
        typeof parsed.theme?.codeTheme === "string"
          ? { light: parsed.theme.codeTheme, dark: parsed.theme.codeTheme }
          : (parsed.theme?.codeTheme ?? {
              light: DEFAULT_SHIKI_THEME_LIGHT,
              dark: DEFAULT_SHIKI_THEME_DARK,
            }),
    },
    markdown: {
      gfm: parsed.markdown?.gfm ?? true,
      headingIds: parsed.markdown?.headingIds ?? true,
      allowDangerousHtml: parsed.markdown?.allowDangerousHtml ?? false,
      externalLinks: {
        target: parsed.markdown?.externalLinks?.target ?? "_blank",
        rel: parsed.markdown?.externalLinks?.rel ?? "noopener noreferrer",
      },
      code: {
        copyButton: parsed.markdown?.code?.copyButton ?? true,
        lineNumbers: parsed.markdown?.code?.lineNumbers ?? false,
      },
      shiki: {
        themes: shikiThemes,
        languages: parsed.markdown?.shiki?.languages,
        unknownLanguage: parsed.markdown?.shiki?.unknownLanguage ?? "warning",
      },
      tableOfContents: {
        minDepth: parsed.markdown?.tableOfContents?.minDepth ?? 2,
        maxDepth: parsed.markdown?.tableOfContents?.maxDepth ?? 3,
      },
      remarkPlugins: parsed.markdown?.remarkPlugins ?? [],
      rehypePlugins: parsed.markdown?.rehypePlugins ?? [],
    },
    styles: parsed.styles ?? [],
    seo: {
      titleTemplate: parsed.seo?.titleTemplate ?? `%s | ${parsed.title}`,
      defaultImage: parsed.seo?.defaultImage,
    },
    sitemap: {
      enabled: parsed.sitemap?.enabled ?? true,
      includeFallbackPages: parsed.sitemap?.includeFallbackPages ?? false,
    },
    build: {
      clean: parsed.build?.clean ?? true,
      trailingSlash: parsed.build?.trailingSlash ?? true,
    },
    dev: {
      port: parsed.dev?.port ?? DEFAULT_DEV_PORT,
      host: parsed.dev?.host ?? DEFAULT_DEV_HOST,
      open: parsed.dev?.open ?? false,
    },
    preview: {
      port: parsed.preview?.port ?? DEFAULT_DEV_PORT,
      host: parsed.preview?.host ?? DEFAULT_DEV_HOST,
      open: parsed.preview?.open ?? false,
    },
    validation: {
      strict: parsed.validation?.strict ?? false,
      failOn: parsed.validation?.failOn ?? [],
    },
    deployment: {
      adapter: parsed.deployment?.adapter as ResolvedConfig["deployment"]["adapter"],
      configFile: {
        mode: parsed.deployment?.configFile?.mode ?? "generated",
      },
      redirects: parsed.deployment?.redirects ?? true,
      headers: parsed.deployment?.headers ?? false,
      cleanUrls: parsed.deployment?.cleanUrls ?? false,
      customDomain: parsed.deployment?.customDomain,
      generateCi: parsed.deployment?.generateCi ?? false,
      preview: {
        enabled: parsed.deployment?.preview?.enabled ?? false,
      },
    },
    redirects: (parsed.redirects ?? []).map((redirect) => ({
      ...redirect,
      source: redirect.source ?? "user",
    })),
    headers: parsed.headers ?? [],
    experimental: parsed.experimental ?? {},
  };
}
