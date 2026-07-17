import Link from "next/link";
import type { RootBehavior, RootLocaleOption } from "../data/types.js";
import { RootDetect } from "./root-detect.js";

export interface RootPageProps {
  behavior: RootBehavior;
  locales: RootLocaleOption[];
  defaultHref: string;
  siteTitle: string;
}

/** The `/` route's behavior when i18n is enabled (spec §16.10). */
export function RootPage({ behavior, locales, defaultHref, siteTitle }: RootPageProps) {
  if (behavior === "detect") {
    return <RootDetect locales={locales} defaultHref={defaultHref} />;
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
