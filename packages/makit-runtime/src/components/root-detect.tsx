"use client";

import { useEffect } from "react";
import type { RootLocaleOption } from "../data/types.js";

const LOCALE_STORAGE_KEY = "makit-locale";

function pickLocale(
  locales: readonly RootLocaleOption[],
  browserLangs: readonly string[],
): RootLocaleOption | undefined {
  for (const lang of browserLangs) {
    const exact = locales.find((l) => l.locale.toLowerCase() === lang.toLowerCase());
    if (exact) return exact;
  }
  for (const lang of browserLangs) {
    const prefix = lang.split("-")[0]?.toLowerCase();
    const partial = locales.find((l) => l.locale.split("-")[0]?.toLowerCase() === prefix);
    if (partial) return partial;
  }
  return undefined;
}

/** Client-side language detection for `i18n.root.behavior: "detect"` (spec §16.10). */
export function RootDetect({
  locales,
  defaultHref,
}: {
  locales: RootLocaleOption[];
  defaultHref: string;
}) {
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      const remembered = stored ? locales.find((l) => l.urlLocale === stored) : undefined;
      if (remembered) {
        window.location.replace(remembered.href);
        return;
      }

      const browserLangs =
        navigator.languages && navigator.languages.length > 0
          ? navigator.languages
          : [navigator.language];
      const detected = pickLocale(locales, browserLangs);
      window.location.replace(detected?.href ?? defaultHref);
    } catch {
      window.location.replace(defaultHref);
    }
  }, [locales, defaultHref]);

  return (
    <p className="flex min-h-screen items-center justify-center text-[var(--makit-color-foreground)]">
      Redirecting… If you are not redirected automatically,{" "}
      <a href={defaultHref} className="ml-1 text-[var(--makit-color-accent)] hover:underline">
        click here
      </a>
      .
    </p>
  );
}
