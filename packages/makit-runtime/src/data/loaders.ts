import { readFile } from "node:fs/promises";
import {
  collectionMapPath,
  collectionNavigationPath,
  collectionsPath,
  globalNavigationPath,
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
  NavigationGroup,
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
): Promise<NavigationGroup[]> {
  // A collection can be absent in a locale (spec §35.5) — treat as empty.
  return readJson<NavigationGroup[]>(collectionNavigationPath(locale, collectionId)).catch(
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

/** Finds the page for a given `(locale, slug)` App Router param pair, or `undefined` if none matches. */
export async function getPageForRoute(
  locale: string,
  slug: readonly string[],
): Promise<GeneratedPage | undefined> {
  const routeMap = await getRouteMap();
  const entry = routeMap[locale]?.[slug.join("/")];
  if (!entry) return undefined;
  return getPageById(locale, entry.collectionId, entry.pageId);
}

/** The locale's home route (the page with zero segments), if one exists. */
export async function getHomeRoute(locale: string): Promise<string | undefined> {
  const pageMap = await getPageMap();
  for (const byPageId of Object.values(pageMap[locale] ?? {})) {
    for (const entry of Object.values(byPageId)) {
      if (entry.segments.length === 0) return entry.route;
    }
  }
  return undefined;
}

export interface StaticParam {
  locale: string;
  slug: string[];
}

/** Params for every non-draft page, for `generateStaticParams` (spec §41). */
export async function getAllStaticParams(): Promise<StaticParam[]> {
  const pageMap = await getPageMap();
  const params: StaticParam[] = [];
  for (const [locale, byCollection] of Object.entries(pageMap)) {
    for (const byPageId of Object.values(byCollection)) {
      for (const entry of Object.values(byPageId)) {
        if (entry.draft) continue;
        params.push({ locale, slug: entry.segments });
      }
    }
  }
  return params;
}
