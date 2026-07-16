import { readFile } from "node:fs/promises";
import { localesPath, manifestPath, navigationPath, pagePath, sitePath } from "./paths.js";
import type { GeneratedPage, I18nData, Manifest, NavigationGroup, SiteData } from "./types.js";

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

export function getManifest(): Promise<Manifest> {
  return readJson(manifestPath());
}

export function getSiteData(): Promise<SiteData> {
  return readJson(sitePath());
}

export function getLocalesData(): Promise<I18nData> {
  return readJson(localesPath());
}

export function getNavigation(locale: string): Promise<NavigationGroup[]> {
  return readJson(navigationPath(locale));
}

export function getPageById(locale: string, pageId: string): Promise<GeneratedPage> {
  return readJson(pagePath(locale, pageId));
}

function segmentsEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((segment, index) => segment === b[index]);
}

/** Finds the page for a given `(locale, slug)` App Router param pair, or `undefined` if none matches. */
export async function getPageForRoute(
  locale: string,
  slug: readonly string[],
): Promise<GeneratedPage | undefined> {
  const manifest = await getManifest();
  const entry = manifest.pages.find(
    (page) => page.locale === locale && segmentsEqual(page.segments, slug),
  );
  if (!entry) return undefined;
  return getPageById(locale, entry.pageId);
}

export interface StaticParam {
  locale: string;
  slug: string[];
}

/** Params for every non-draft page, for `generateStaticParams` (spec §33.3). */
export async function getAllStaticParams(): Promise<StaticParam[]> {
  const manifest = await getManifest();
  return manifest.pages
    .filter((page) => !page.draft)
    .map((page) => ({ locale: page.locale, slug: page.segments }));
}
