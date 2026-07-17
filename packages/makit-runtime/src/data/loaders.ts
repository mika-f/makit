import { readFile } from "node:fs/promises";
import {
  collectionMapPath,
  collectionNavigationPath,
  collectionsPath,
  globalNavigationPath,
  homePath,
  localesPath,
  pageMapPath,
  pagePath,
  routeMapPath,
  sitePath,
  translationMapPath,
} from "./paths.js";
import type {
  CollectionData,
  GeneratedPage,
  GlobalNavigationGroup,
  I18nData,
  LocalePageMap,
  LocaleRouteMap,
  PortalHomeData,
  ResolvedNavNode,
  RouteMapEntry,
  SiteData,
} from "./types.js";

// A static production build reads each generated file exactly once per
// unique path, so caching avoids re-parsing the same JSON across many page
// renders. In `next dev`, content is regenerated on disk while the server
// keeps running, so caching is disabled there to avoid serving stale data.
const cache = new Map<string, Promise<unknown>>();
const cacheEnabled = process.env.NODE_ENV === "production";

async function readJson<T>(path: string): Promise<T> {
  if (!cacheEnabled) {
    return readFile(path, "utf-8").then((raw) => JSON.parse(raw) as T);
  }
  let promise = cache.get(path) as Promise<T> | undefined;
  if (!promise) {
    promise = readFile(path, "utf-8").then((raw) => JSON.parse(raw) as T);
    cache.set(path, promise);
  }
  return promise;
}

export function getSiteData(): Promise<SiteData> {
  return readJson(sitePath());
}

export function getLocalesData(): Promise<I18nData> {
  return readJson(localesPath());
}

export function getCollections(): Promise<CollectionData[]> {
  return readJson(collectionsPath());
}

export function getGlobalNavigation(locale: string): Promise<GlobalNavigationGroup[]> {
  return readJson(globalNavigationPath(locale));
}

export function getCollectionNavigation(
  locale: string,
  collectionId: string,
): Promise<ResolvedNavNode[]> {
  // A collection can be absent in a locale (spec §35.5) — treat as empty.
  return readJson<ResolvedNavNode[]>(collectionNavigationPath(locale, collectionId)).catch(
    () => [],
  );
}

export function getPageById(
  locale: string,
  collectionId: string,
  pageId: string,
): Promise<GeneratedPage> {
  return readJson(pagePath(locale, collectionId, pageId));
}

/** `pageMap[locale][collectionId][pageId]` (spec §40 `indexes/page-map.json`). */
export function getPageMap(): Promise<Record<string, LocalePageMap>> {
  return readJson(pageMapPath());
}

/** `routeMap[locale][joinedSegments]` (spec §40 `indexes/route-map.json`). */
export function getRouteMap(): Promise<Record<string, LocaleRouteMap>> {
  return readJson(routeMapPath());
}

/** `collectionMap[collectionId][locale]` → collection root route. */
export function getCollectionMap(): Promise<Record<string, Record<string, string>>> {
  return readJson(collectionMapPath());
}

/** `translationMap["{collectionId}:{pageId}"][locale]` → route (real translations only). */
export function getTranslationMap(): Promise<Record<string, Record<string, string>>> {
  return readJson(translationMapPath());
}

/** The raw route-map entry for a `(locale, slug)` pair — lets a route template decide page vs. portal before fetching either. */
export async function getRouteEntry(
  locale: string,
  slug: readonly string[],
): Promise<RouteMapEntry | undefined> {
  const routeMap = await getRouteMap();
  return routeMap[locale]?.[slug.join("/")];
}

/** Finds the page for a given `(locale, slug)` App Router param pair, or `undefined` if none matches (or it's a portal home). */
export async function getPageForRoute(
  locale: string,
  slug: readonly string[],
): Promise<GeneratedPage | undefined> {
  const routeMap = await getRouteMap();
  const entry = routeMap[locale]?.[slug.join("/")];
  if (!entry || entry.kind !== "page") return undefined;
  return getPageById(locale, entry.collectionId, entry.pageId);
}

/** The resolved payload for a synthesized portal home (spec §33.2, `home/{locale}.json`). */
export function getHomeData(locale: string): Promise<PortalHomeData> {
  return readJson(homePath(locale));
}

/** The locale's home route — whatever occupies `segments: []` (a page, an aliased page, or a portal). */
export async function getHomeRoute(locale: string): Promise<string | undefined> {
  const routeMap = await getRouteMap();
  const entry = routeMap[locale]?.[""];
  if (!entry) return undefined;
  if (entry.kind === "portal") return entry.route;
  return (await getPageById(locale, entry.collectionId, entry.pageId)).route;
}

export interface StaticParam {
  locale: string;
  slug: string[];
}

/**
 * Params for every non-draft page, for `generateStaticParams` (spec §41).
 * Combines the page map (every real/fallback/synthesized page, honoring
 * `draft`) with any route-map-only entries — currently just the portal
 * home, which has no backing `GeneratedPage`.
 */
export async function getAllStaticParams(): Promise<StaticParam[]> {
  const [pageMap, routeMap] = await Promise.all([getPageMap(), getRouteMap()]);
  const params: StaticParam[] = [];
  const seen = new Set<string>();

  for (const [locale, byCollection] of Object.entries(pageMap)) {
    for (const byPageId of Object.values(byCollection)) {
      for (const entry of Object.values(byPageId)) {
        if (entry.draft) continue;
        const key = `${locale}:${entry.segments.join("/")}`;
        if (seen.has(key)) continue;
        seen.add(key);
        params.push({ locale, slug: entry.segments });
      }
    }
  }

  for (const [locale, byRoute] of Object.entries(routeMap)) {
    for (const joinedSegments of Object.keys(byRoute)) {
      const key = `${locale}:${joinedSegments}`;
      if (seen.has(key)) continue;
      seen.add(key);
      params.push({ locale, slug: joinedSegments === "" ? [] : joinedSegments.split("/") });
    }
  }

  return params;
}
