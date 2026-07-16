import type { GeneratedAlternate, GeneratedPage } from "../types/page.js";
import type { ResolvedConfig, ResolvedLocaleConfig } from "../types/resolved-config.js";
import { buildRoute, detectDuplicateRoutes } from "./routes.js";

export interface PageGroup {
  /** Translations of the same content, keyed by URL-facing locale (spec §16.6). */
  byLocale: Map<string, GeneratedPage>;
}

/**
 * Groups pages that are translations of each other. The matching key is the
 * already-computed `pageId` (front matter `id`, or else the route-derived
 * segments — spec §16.6 tiers 1-2). Tier 3 (matching by raw file path when a
 * `slug` override makes the route diverge from the file path) is not
 * implemented: it only matters when a `slug` override is used inconsistently
 * across locale siblings, an unusual authoring pattern the spec itself
 * discourages by recommending explicit `id` for translation matching.
 */
export function groupPagesByPageId(pages: readonly GeneratedPage[]): Map<string, PageGroup> {
  const groups = new Map<string, PageGroup>();
  for (const page of pages) {
    let group = groups.get(page.pageId);
    if (!group) {
      group = { byLocale: new Map() };
      groups.set(page.pageId, group);
    }
    group.byLocale.set(page.locale, page);
  }
  return groups;
}

function buildFallbackPage(
  sourcePage: GeneratedPage,
  targetLocale: ResolvedLocaleConfig,
  config: ResolvedConfig,
): GeneratedPage {
  const route = buildRoute(sourcePage.segments, {
    basePath: config.basePath,
    localePrefix: targetLocale.urlLocale,
    trailingSlash: config.build.trailingSlash,
  });

  const isRedirect = config.i18n.fallback.behavior === "redirect";

  return {
    pageId: sourcePage.pageId,
    route,
    segments: sourcePage.segments,
    locale: targetLocale.urlLocale,
    contentLocale: sourcePage.locale,
    sourcePath: sourcePage.sourcePath,
    isFallback: true,
    fallbackSource: sourcePage.route,
    title: sourcePage.title,
    description: sourcePage.description,
    // "render" shows the default-locale content as-is; "redirect" is a static
    // transitional page — the real `<meta refresh>` mechanics belong to the
    // Next.js runtime (a later phase), so this is just a no-JS-safe fallback body.
    html: isRedirect
      ? `<p>This page has not been translated yet. <a href="${sourcePage.route}">Continue to the ${sourcePage.contentLocale} version</a>.</p>`
      : sourcePage.html,
    headings: isRedirect ? [] : sourcePage.headings,
    draft: sourcePage.draft,
    hidden: sourcePage.hidden,
    sidebar: sourcePage.sidebar,
    tableOfContents: sourcePage.tableOfContents,
    order: sourcePage.order,
    navigation: sourcePage.navigation,
    metadata: {
      ...sourcePage.metadata,
      // Fallback pages point their canonical at the real content (spec §16.12).
      canonical: sourcePage.route,
    },
  };
}

/**
 * Generates fallback pages for locales missing a translation (spec §16.7-16.8).
 * Returns only the *new* fallback pages — callers should concatenate them
 * with the real pages. Requires `pages` to already be duplicate-free.
 */
export function generateFallbackPages(
  pages: readonly GeneratedPage[],
  config: ResolvedConfig,
): GeneratedPage[] {
  const fallback = config.i18n.fallback;
  if (!config.i18n.enabled || !fallback.enabled || fallback.behavior === "not-found") {
    return [];
  }

  const defaultLocale = config.i18n.locales.find(
    (locale) => locale.locale === config.i18n.defaultLocale,
  );
  if (!defaultLocale) return [];

  const groups = groupPagesByPageId(pages);
  const fallbackPages: GeneratedPage[] = [];

  for (const group of groups.values()) {
    const sourcePage = group.byLocale.get(defaultLocale.urlLocale);
    if (!sourcePage) continue; // no default-locale content to fall back to

    for (const locale of config.i18n.locales) {
      if (locale.urlLocale === defaultLocale.urlLocale) continue;
      if (group.byLocale.has(locale.urlLocale)) continue; // a real translation already exists

      fallbackPages.push(buildFallbackPage(sourcePage, locale, config));
    }
  }

  // Fallback routes are only skipped when a *real* page already claims that
  // (locale, route) slot, but an unrelated real page elsewhere could still
  // coincidentally claim the same computed route (e.g. via a `slug`
  // override) — re-verify uniqueness across the combined set.
  detectDuplicateRoutes([...pages, ...fallbackPages]);

  return fallbackPages;
}

/**
 * Fills in `metadata.alternates` (hreflang, spec §16.2, §24.5) by cross-
 * referencing real translations within each pageId group. Fallback pages
 * are excluded entirely — both from appearing as an alternate, and from
 * having alternates of their own (spec §16.12: fallback pages are left out
 * of hreflang, sitemaps, and translation listings).
 */
export function populateAlternates(
  pages: readonly GeneratedPage[],
  config: ResolvedConfig,
): GeneratedPage[] {
  if (!config.i18n.enabled) return [...pages];

  const realPages = pages.filter((page) => !page.isFallback);
  const groups = groupPagesByPageId(realPages);
  const defaultLocale = config.i18n.locales.find(
    (locale) => locale.locale === config.i18n.defaultLocale,
  );

  return pages.map((page) => {
    if (page.isFallback) return page;

    const group = groups.get(page.pageId);
    // No point emitting hreflang for a page with no sibling translations at all.
    if (!group || group.byLocale.size < 2) return page;

    const alternates: GeneratedAlternate[] = [];
    for (const [urlLocale, otherPage] of group.byLocale) {
      if (urlLocale === page.locale) continue;
      const localeConfig = config.i18n.locales.find((locale) => locale.urlLocale === urlLocale);
      if (!localeConfig) continue;
      alternates.push({ urlLocale, hreflang: localeConfig.locale, href: otherPage.route });
    }

    if (defaultLocale) {
      const defaultPage = group.byLocale.get(defaultLocale.urlLocale);
      if (defaultPage) {
        alternates.push({ urlLocale: "x-default", hreflang: "x-default", href: defaultPage.route });
      }
    }

    return { ...page, metadata: { ...page.metadata, alternates } };
  });
}
