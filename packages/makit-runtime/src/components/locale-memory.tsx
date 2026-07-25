"use client";

import { useEffect } from "react";
import { LOCALE_STORAGE_KEY } from "../i18n/locale-storage.js";

/**
 * Remembers the locale the visitor is currently reading in (spec §35.7), so
 * the locale gateway at `/` — and at any locale-less path — can send them
 * straight back to it next time instead of re-detecting from the browser.
 *
 * The locale is read from the URL rather than passed in, because this renders
 * from the generated root layout, which is shared by every route and cannot
 * see a page's locale. That also makes it a no-op on the gateway pages
 * themselves: their paths carry no locale prefix, so nothing is written and a
 * previous choice survives.
 */
export function LocaleMemory({
  urlLocales,
  basePath,
}: {
  /** URL-facing locale segments (`["en-us", "ja-jp"]`). */
  urlLocales: readonly string[];
  /** `site.basePath`, stripped before reading the locale segment. */
  basePath: string;
}) {
  useEffect(() => {
    try {
      const path = window.location.pathname;
      const withoutBase = basePath && path.startsWith(basePath) ? path.slice(basePath.length) : path;
      const first = withoutBase.split("/").find((segment) => segment.length > 0);
      if (first && urlLocales.includes(first)) {
        localStorage.setItem(LOCALE_STORAGE_KEY, first);
      }
    } catch {
      // Private-mode / disabled storage: the gateway just falls back to
      // browser-language detection.
    }
  }, [urlLocales, basePath]);

  return null;
}
