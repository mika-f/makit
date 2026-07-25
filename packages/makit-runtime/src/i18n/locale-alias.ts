// Locale-less routes (spec §35.7).
//
// With i18n enabled every page lives under a locale prefix, so a link to
// `/getting-started` — written by hand, shared, or carried over from a
// single-locale version of the site — resolves to nothing. Makit answers those
// paths with a *locale gateway*: the same page in each locale that has it,
// routed exactly the way `/` is (`i18n.root.behavior`).
//
// Resolution is pure index lookup, kept free of `node:fs` so both the data
// loaders and the tests can use it.

import type { I18nData, LocalePageMap, LocaleRouteMap, RootLocaleOption } from "../data/types.js";

/** The two index maps a locale-less route is resolved against (spec §40). */
export interface LocaleAliasMaps {
  routeMap: Record<string, LocaleRouteMap>;
  pageMap: Record<string, LocalePageMap>;
}

/**
 * The per-locale versions of one locale-less path — `["getting-started"]` ->
 * `/en-us/getting-started/` + `/ja-jp/getting-started/` — in the site's locale
 * order. Empty when the path is not a locale-less route, which is what tells
 * the caller to 404 instead.
 *
 * A locale that lacks the page is simply omitted, so a partially translated
 * site only ever offers locales that can actually serve it. (With page
 * fallback on, spec §35.4, every locale has a route and every locale is
 * offered.)
 */
export function resolveLocaleAliasTargets(
  i18n: I18nData,
  maps: LocaleAliasMaps,
  segments: readonly string[],
): RootLocaleOption[] {
  if (!i18n.enabled) return [];
  // `/` is the root gateway's own route, generated separately (spec §35.7).
  if (segments.length === 0) return [];
  // A path that already starts with a locale prefix is that locale's — a miss
  // there is a real 404, never a gateway.
  if (i18n.locales.some((locale) => locale.urlLocale === segments[0])) return [];

  const key = segments.join("/");
  const targets: RootLocaleOption[] = [];
  for (const locale of i18n.locales) {
    const entry = maps.routeMap[locale.urlLocale]?.[key];
    if (!entry) continue;
    let href: string;
    if (entry.kind === "portal") {
      href = entry.route;
    } else {
      const page = maps.pageMap[locale.urlLocale]?.[entry.collectionId]?.[entry.pageId];
      // Drafts have no production route to send anyone to (spec §16).
      if (!page || page.draft) continue;
      href = page.route;
    }
    targets.push({
      locale: locale.locale,
      urlLocale: locale.urlLocale,
      label: locale.label,
      href,
    });
  }
  return targets;
}

/**
 * Every locale-less route the site should serve a gateway for: the union of
 * all locales' routes, minus the ones no locale can actually serve. Drives
 * `generateStaticParams`, so a static export ships one gateway file per
 * locale-less path (spec §41).
 */
export function collectLocaleAliasRoutes(i18n: I18nData, maps: LocaleAliasMaps): string[][] {
  if (!i18n.enabled) return [];

  const seen = new Set<string>();
  const routes: string[][] = [];
  for (const locale of i18n.locales) {
    for (const key of Object.keys(maps.routeMap[locale.urlLocale] ?? {})) {
      if (key === "" || seen.has(key)) continue;
      seen.add(key);
      const segments = key.split("/");
      if (resolveLocaleAliasTargets(i18n, maps, segments).length === 0) continue;
      routes.push(segments);
    }
  }
  return routes;
}

/**
 * The locale a gateway falls back to when nothing better is known — the
 * visitor has no stored or matching language, or JavaScript never ran
 * (`i18n.root.behavior: "default"`). `i18n.root.locale` overrides
 * `defaultLocale` here, mirroring the `/` redirect emitted for adapters.
 */
export function localeAliasFallback<T extends { locale: string }>(
  i18n: I18nData,
  targets: readonly T[],
): T | undefined {
  const preferred = i18n.root.locale ?? i18n.defaultLocale;
  return targets.find((target) => target.locale === preferred) ?? targets[0];
}
