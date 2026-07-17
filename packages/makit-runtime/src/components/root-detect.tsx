"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { RootLocaleOption } from "../data/types.js";
import { negotiateLocale } from "../i18n/negotiate-locale.js";

const LOCALE_STORAGE_KEY = "makit-locale";

/** Client-side language detection for `i18n.root.behavior: "detect"` (spec §16.10). */
export function RootDetect({
  locales,
  defaultHref,
  defaultLocale,
}: {
  locales: RootLocaleOption[];
  defaultHref: string;
  /** BCP-47 tag of the site's default locale, used to break exact matches ties. */
  defaultLocale: string;
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
      const detected = negotiateLocale(locales, browserLangs, { default: defaultLocale });
      window.location.replace(detected?.href ?? defaultHref);
    } catch {
      window.location.replace(defaultHref);
    }
  }, [locales, defaultHref, defaultLocale]);

  return (
    <p className="flex min-h-screen items-center justify-center text-[var(--makit-color-foreground)]">
      Redirecting… If you are not redirected automatically,{" "}
      <Link href={defaultHref} className="ml-1 text-[var(--makit-color-accent)] hover:underline">
        click here
      </Link>
      .
    </p>
  );
}
