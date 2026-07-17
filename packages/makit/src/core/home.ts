import type { GeneratedPage } from "../types/page.js";
import type { ResolvedConfig, ResolvedLocaleConfig } from "../types/resolved-config.js";
import type { ResolvedCollection } from "./collections.js";
import { resolveCollectionLocale } from "./collections.js";
import { MakitError } from "./errors.js";
import { localizeValue } from "./localize.js";
import { buildRoute } from "./routes.js";

export interface PortalCollectionCard {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  href: string;
}

export interface PortalHomeData {
  featuredCollections: PortalCollectionCard[];
  sections: { title?: string; collections: PortalCollectionCard[] }[];
}

export type ResolvedHome =
  /** A real page (or synthesized collection top) already occupies the site root. */
  | { kind: "existing" }
  /** `home.layout: "page"`, or the single-collection default — a page is aliased to the site root. */
  | { kind: "page"; collectionId: string; pageId: string }
  /** `home.layout: "portal"`, or the multi-collection default. */
  | { kind: "portal"; data: PortalHomeData };

function collectionCard(
  collection: ResolvedCollection,
  locale: ResolvedLocaleConfig,
  config: ResolvedConfig,
): PortalCollectionCard | undefined {
  const collectionLocale = resolveCollectionLocale(collection, locale, config);
  if (!collectionLocale) return undefined;
  return {
    id: collection.id,
    title: collectionLocale.title,
    description: collectionLocale.description,
    icon: collection.icon,
    href: buildRoute([], {
      basePath: config.basePath,
      localePrefix: config.i18n.enabled ? locale.urlLocale : undefined,
      collectionSegments: collection.pathSegments,
      trailingSlash: config.build.trailingSlash,
    }),
  };
}

function requireCollectionCard(
  id: string,
  collections: readonly ResolvedCollection[],
  locale: ResolvedLocaleConfig,
  config: ResolvedConfig,
): PortalCollectionCard | undefined {
  const collection = collections.find((c) => c.id === id);
  if (!collection) {
    throw new MakitError(
      "unknown-home-collection",
      `home config references unknown collection "${id}" (spec §45).`,
    );
  }
  if (collection.hidden) return undefined;
  return collectionCard(collection, locale, config);
}

function buildPortalData(
  locale: ResolvedLocaleConfig,
  config: ResolvedConfig,
  collections: readonly ResolvedCollection[],
): PortalHomeData {
  const featuredCollections = config.home.featuredCollections
    .map((id) => requireCollectionCard(id, collections, locale, config))
    .filter((card): card is PortalCollectionCard => card !== undefined);

  const sections = config.home.sections.map((section) => ({
    title: localizeValue(section.title, locale),
    collections: section.collections
      .map((id) => requireCollectionCard(id, collections, locale, config))
      .filter((card): card is PortalCollectionCard => card !== undefined),
  }));

  if (featuredCollections.length === 0 && sections.length === 0) {
    // No explicit selection — default to every visible collection (spec §33.2).
    const allCards = collections
      .filter((collection) => !collection.hidden)
      .map((collection) => collectionCard(collection, locale, config))
      .filter((card): card is PortalCollectionCard => card !== undefined);
    return { featuredCollections: allCards, sections: [] };
  }

  return { featuredCollections, sections };
}

/**
 * Resolves what occupies the site root (`segments: []`) for one locale
 * (spec §33): an existing page, a page aliased to the root, or a
 * synthesized portal. `pages` should be every page already built for this
 * locale (real, fallback, and synthesized collection tops).
 */
export function resolveHome(
  locale: ResolvedLocaleConfig,
  pages: readonly GeneratedPage[],
  config: ResolvedConfig,
  collections: readonly ResolvedCollection[],
): ResolvedHome {
  const localePages = pages.filter((page) => page.locale === locale.urlLocale);
  const rootPage = localePages.find((page) => page.segments.length === 0);
  const layout = config.home.layout;

  if (layout === "page") {
    if (rootPage) {
      throw new MakitError(
        "home-root-conflict",
        `home.layout is "page", but collection "${rootPage.collectionId}" already has a page at the site root in locale "${locale.urlLocale}".`,
      );
    }
    const candidates = localePages.filter((page) => page.pageId === config.home.page);
    if (candidates.length === 0) {
      throw new MakitError(
        "home-page-not-found",
        `home.page "${config.home.page}" was not found in locale "${locale.urlLocale}" (spec §45).`,
      );
    }
    if (candidates.length > 1) {
      throw new MakitError(
        "ambiguous-home-page",
        `home.page "${config.home.page}" matches pages in multiple collections in locale "${locale.urlLocale}": ${candidates.map((p) => p.collectionId).join(", ")}.`,
      );
    }
    return {
      kind: "page",
      collectionId: candidates[0]!.collectionId,
      pageId: candidates[0]!.pageId,
    };
  }

  if (layout === "portal") {
    if (rootPage) {
      throw new MakitError(
        "home-root-conflict",
        `home.layout is "portal", but collection "${rootPage.collectionId}" already has a page at the site root in locale "${locale.urlLocale}".`,
      );
    }
    return { kind: "portal", data: buildPortalData(locale, config, collections) };
  }

  // No explicit layout: derive from the collection topology (spec §33).
  if (rootPage) return { kind: "existing" };

  const visible = collections.filter(
    (collection) => !collection.hidden && collection.locales[locale.urlLocale],
  );
  if (visible.length === 1) {
    const only = visible[0]!;
    const topPage = localePages.find(
      (page) => page.collectionId === only.id && page.pathSegments.length === 0,
    );
    if (topPage) return { kind: "page", collectionId: only.id, pageId: topPage.pageId };
    return { kind: "existing" };
  }
  if (visible.length === 0) {
    // No collection has *real* content in this locale — fall back to a
    // portal of whatever is still displayable via collectionFallback (spec
    // §35.5); if nothing is even fallback-visible, there's truly nothing to
    // serve at the root.
    const anyDisplayable = collections.some(
      (collection) => !collection.hidden && resolveCollectionLocale(collection, locale, config),
    );
    if (!anyDisplayable) return { kind: "existing" };
  }

  return { kind: "portal", data: buildPortalData(locale, config, collections) };
}
