import { rm } from "node:fs/promises";
import { join } from "node:path";
import type { ResolvedNavNode } from "./nav-nodes.js";
import type { GeneratedPage } from "../types/page.js";
import type { ResolvedConfig } from "../types/resolved-config.js";
import { atomicWriteFile } from "./atomic-write.js";
import type { ResolvedCollection } from "./collections.js";
import { resolveCollectionLocale } from "./collections.js";
import { resolveHome } from "./home.js";
import { resolveGlobalNavigation } from "./navigation.js";
import { buildRoute } from "./routes.js";
import { buildSearchIndex } from "./search-index.js";
import { translationKey } from "./i18n.js";

export interface WriteGeneratedDataResult {
  generatedDir: string;
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await atomicWriteFile(path, `${JSON.stringify(data, null, 2)}\n`);
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

/** One entry of `indexes/route-map.json`: `routeMap[locale][joinedSegments]`. */
export type RouteMapEntry =
  | { kind: "page"; collectionId: string; pageId: string }
  /** The synthesized site home (spec §33.2) — see `home/{locale}.json`. */
  | { kind: "portal"; route: string };

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
      /** The collection top-page route in this locale. */
      rootRoute: string;
    }
  >;
}

/**
 * Writes `.makit/generated/` in the spec §40 layout: site/locale/collection
 * descriptors, per-(locale, collection) navigation and pages, and the
 * page/route/collection/translation index maps.
 */
export async function writeGeneratedData(
  config: ResolvedConfig,
  pages: readonly GeneratedPage[],
  collections: readonly ResolvedCollection[],
  navigationByLocale: Readonly<Record<string, Record<string, ResolvedNavNode[]>>> = {},
): Promise<WriteGeneratedDataResult> {
  const generatedDir = join(config.root, ".makit", "generated");
  // Stale files from a previous layout (deleted pages, renamed collections)
  // must not survive a regeneration (spec §5.5).
  await rm(generatedDir, { recursive: true, force: true });

  const site = {
    title: config.title,
    description: config.description,
    lang: config.lang,
    siteUrl: config.siteUrl,
    basePath: config.basePath,
    home: config.home,
    header: config.header,
    footer: config.footer,
    theme: config.theme,
    seo: config.seo,
    styles: config.styles,
    navigation: {
      pagination: config.navigation.pagination,
    },
    markdown: {
      tableOfContents: config.markdown.tableOfContents,
      code: config.markdown.code,
    },
  };
  await writeJson(join(generatedDir, "site.json"), site);

  await writeJson(join(generatedDir, "locales.json"), config.i18n);

  const collectionsData: CollectionData[] = collections.map((collection) => {
    const locales: CollectionData["locales"] = {};
    for (const locale of config.i18n.locales) {
      // Falls back to the default locale's title/description when this
      // collection has no native content here but collectionFallback still
      // renders it (spec §35.5) — keeps the collection switcher and portal
      // cards in sync with what actually has a route.
      const collectionLocale = resolveCollectionLocale(collection, locale, config);
      if (!collectionLocale) continue;
      locales[locale.urlLocale] = {
        title: collectionLocale.title,
        description: collectionLocale.description,
        rootRoute: buildRoute([], {
          basePath: config.basePath,
          localePrefix: config.i18n.enabled ? locale.urlLocale : undefined,
          collectionSegments: collection.pathSegments,
          trailingSlash: config.build.trailingSlash,
        }),
      };
    }
    return {
      id: collection.id,
      pathSegments: [...collection.pathSegments],
      index: collection.index,
      icon: collection.icon,
      hidden: collection.hidden,
      implicit: collection.implicit,
      locales,
    };
  });
  await writeJson(join(generatedDir, "collections.json"), collectionsData);

  for (const page of pages) {
    await writeJson(
      join(generatedDir, "pages", page.locale, page.collectionId, `${page.pageId}.json`),
      page,
    );
  }

  for (const locale of config.i18n.locales) {
    const global = resolveGlobalNavigation(config.navigation.global, locale, config, collections);
    await writeJson(join(generatedDir, "navigation", locale.urlLocale, "global.json"), global);

    const byCollection = navigationByLocale[locale.urlLocale] ?? {};
    for (const [collectionId, navigation] of Object.entries(byCollection)) {
      await writeJson(
        join(generatedDir, "navigation", locale.urlLocale, `${collectionId}.json`),
        navigation,
      );
    }
  }

  const pageMap: Record<string, Record<string, Record<string, PageMapEntry>>> = {};
  const routeMap: Record<string, Record<string, RouteMapEntry>> = {};
  const translationMap: Record<string, Record<string, string>> = {};
  for (const page of pages) {
    ((pageMap[page.locale] ??= {})[page.collectionId] ??= {})[page.pageId] = {
      route: page.route,
      segments: page.segments,
      title: page.title,
      draft: page.draft,
      hidden: page.hidden,
      isFallback: page.isFallback,
    };
    (routeMap[page.locale] ??= {})[page.segments.join("/")] = {
      collectionId: page.collectionId,
      pageId: page.pageId,
      kind: "page",
    };
    if (!page.isFallback) {
      (translationMap[translationKey(page)] ??= {})[page.locale] = page.route;
    }
  }
  const collectionMap: Record<string, Record<string, string>> = {};
  for (const collection of collectionsData) {
    collectionMap[collection.id] = Object.fromEntries(
      Object.entries(collection.locales).map(([locale, data]) => [locale, data.rootRoute]),
    );
  }

  for (const locale of config.i18n.locales) {
    const home = resolveHome(locale, pages, config, collections);
    if (home.kind === "page") {
      (routeMap[locale.urlLocale] ??= {})[""] = {
        kind: "page",
        collectionId: home.collectionId,
        pageId: home.pageId,
      };
    } else if (home.kind === "portal") {
      const route = buildRoute([], {
        basePath: config.basePath,
        localePrefix: config.i18n.enabled ? locale.urlLocale : undefined,
        trailingSlash: config.build.trailingSlash,
      });
      (routeMap[locale.urlLocale] ??= {})[""] = { kind: "portal", route };
      await writeJson(join(generatedDir, "home", `${locale.urlLocale}.json`), home.data);
    }
  }

  await writeJson(join(generatedDir, "indexes", "page-map.json"), pageMap);
  await writeJson(join(generatedDir, "indexes", "route-map.json"), routeMap);
  await writeJson(join(generatedDir, "indexes", "collection-map.json"), collectionMap);
  await writeJson(join(generatedDir, "indexes", "translation-map.json"), translationMap);

  const searchByLocale = buildSearchIndex(pages);
  for (const [locale, entries] of Object.entries(searchByLocale)) {
    await writeJson(join(generatedDir, "search", `${locale}.json`), entries);
  }

  return { generatedDir };
}
