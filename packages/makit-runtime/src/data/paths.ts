import { join } from "node:path";

// `.makit/` is always the Next.js app's cwd when Makit invokes `next build`/`next dev`,
// so `.makit/generated/` resolves relative to `process.cwd()`.
const GENERATED_DIR = join(process.cwd(), "generated");

export function manifestPath(): string {
  return join(GENERATED_DIR, "manifest.json");
}

export function sitePath(): string {
  return join(GENERATED_DIR, "site.json");
}

export function localesPath(): string {
  return join(GENERATED_DIR, "locales.json");
}

export function navigationPath(locale: string): string {
  return join(GENERATED_DIR, "navigation", `${locale}.json`);
}

export function pagePath(locale: string, pageId: string): string {
  return join(GENERATED_DIR, "pages", locale, `${pageId}.json`);
}
