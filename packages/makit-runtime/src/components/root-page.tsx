import Link from "next/link";
import type { RootBehavior, RootLocaleOption } from "../data/types.js";
import type { ThemeComponents } from "../theme/components.js";
import { RootDetect } from "./root-detect.js";

export interface RootPageProps {
  behavior: RootBehavior;
  locales: RootLocaleOption[];
  defaultHref: string;
  /** BCP-47 tag of the site's default locale (`i18n.defaultLocale`). */
  defaultLocale: string;
  siteTitle: string;
  /**
   * The requested path's segments when this gateway stands in for a
   * locale-less deep link — `/getting-started` -> `["getting-started"]`
   * (spec §35.7). Absent at `/`. The standard implementation ignores it; a
   * theme can use it to word the page differently for a deep link.
   */
  segments?: readonly string[];
  /** The resolved slot map (THEME §6). Unused by the standard implementation. */
  components: ThemeComponents;
}

/**
 * The locale gateway: the `/` route's behavior when i18n is enabled (spec
 * §16.10), reused for locale-less deep links (spec §35.7). `locales` carries
 * whichever page each locale should receive — the locale's home at `/`, the
 * requested page for a deep link.
 */
export function RootPage({
  behavior,
  locales,
  defaultHref,
  defaultLocale,
  siteTitle,
}: RootPageProps) {
  if (behavior === "detect") {
    return <RootDetect locales={locales} defaultHref={defaultHref} defaultLocale={defaultLocale} />;
  }

  if (behavior === "select") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--makit-color-background)] text-[var(--makit-color-foreground)]">
        <h1 className="text-2xl font-semibold">{siteTitle}</h1>
        <ul className="flex flex-col gap-2 text-center">
          {locales.map((locale) => (
            <li key={locale.urlLocale}>
              <Link href={locale.href} className="text-[var(--makit-color-accent)] hover:underline">
                {locale.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // "default": a static, JS-free transition (spec §16.10). React 19 hoists a
  // <meta> rendered anywhere in the tree up into <head>, so this works without
  // any client-side code.
  return (
    <>
      <meta httpEquiv="refresh" content={`0;url=${defaultHref}`} />
      <p className="flex min-h-screen items-center justify-center text-[var(--makit-color-foreground)]">
        Redirecting to{" "}
        <Link href={defaultHref} className="ml-1 text-[var(--makit-color-accent)] hover:underline">
          {defaultHref}
        </Link>
        …
      </p>
    </>
  );
}
