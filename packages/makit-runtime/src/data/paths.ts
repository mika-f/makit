import { join } from "node:path";

// `.makit/` is always the Next.js app's cwd when Makit invokes `next build`/`next dev`,
// so `.makit/generated/` resolves relative to `process.cwd()`.
const GENERATED_DIR = join(process.cwd(), "generated");

export function sitePath(): string {
  return join(GENERATED_DIR, "site.json");
}

export function localesPath(): string {
  return join(GENERATED_DIR, "locales.json");
}

export function collectionsPath(): string {
  return join(GENERATED_DIR, "collections.json");
}

export function globalNavigationPath(locale: string): string {
  return join(GENERATED_DIR, "navigation", locale, "global.json");
}

export function collectionNavigationPath(locale: string, collectionId: string): string {
  return join(GENERATED_DIR, "navigation", locale, `${collectionId}.json`);
}

export function pagePath(locale: string, collectionId: string, pageId: string): string {
  return join(GENERATED_DIR, "pages", locale, collectionId, `${pageId}.json`);
}

export function homePath(locale: string): string {
  return join(GENERATED_DIR, "home", `${locale}.json`);
}

export function pageMapPath(): string {
  return join(GENERATED_DIR, "indexes", "page-map.json");
}

export function routeMapPath(): string {
  return join(GENERATED_DIR, "indexes", "route-map.json");
}

export function collectionMapPath(): string {
  return join(GENERATED_DIR, "indexes", "collection-map.json");
}

export function translationMapPath(): string {
  return join(GENERATED_DIR, "indexes", "translation-map.json");
}
