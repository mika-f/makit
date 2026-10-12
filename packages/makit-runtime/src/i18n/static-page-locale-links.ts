// The language switcher of a static page (STATIC-PAGES §10.2). Kept free of
// `node:fs` and React so it can be unit-tested; the caller supplies each
// locale's home route.

import type { GeneratedStaticPage, LocaleData } from "../data/types.js";

export interface LocaleLink {
  locale: LocaleData;
  href: string;
  /** Whether this is the locale being viewed. */
  current: boolean;
}

/**
 * One link per locale, in the site's locale order: the same static page
 * where that locale has it, otherwise the locale's home, otherwise nothing.
 * Empty when there is no other locale to switch to.
 */
export function resolveStaticPageLocaleLinks(
  page: GeneratedStaticPage,
  locales: readonly LocaleData[],
  homeRoutes: Readonly<Record<string, string | undefined>>,
): LocaleLink[] {
  const links: LocaleLink[] = [];
  for (const locale of locales) {
    if (locale.urlLocale === page.locale) {
      links.push({ locale, href: page.route, current: true });
      continue;
    }
    const alternate = page.metadata.alternates.find(
      (candidate) => candidate.urlLocale === locale.urlLocale,
    );
    const href = alternate?.href ?? homeRoutes[locale.urlLocale];
    if (href) links.push({ locale, href, current: false });
  }
  return links.length < 2 ? [] : links;
}
