import type { ReactNode } from "react";
import { getGlobalNavigation, getHomeRoute, getSearchIndex } from "../data/loaders.js";
import type { GeneratedStaticPage, I18nData, SiteData } from "../data/types.js";
import { resolveStaticPageLocaleLinks } from "../i18n/static-page-locale-links.js";
import type { ThemeComponents } from "../theme/components.js";
import { HeaderActions } from "./header-actions.js";
import { LocaleLinks } from "./locale-links.js";

export interface StaticPageProps {
  page: GeneratedStaticPage;
  site: SiteData;
  i18n: I18nData;
  locale: string;
  /** The resolved slot map (THEME §6). */
  components: ThemeComponents;
  /** The Static Page Component's element, or the element rendering the HTML Fragment. */
  children: ReactNode;
}

/**
 * The standard theme's shell for a static page (STATIC-PAGES §10.2). Owns
 * only the frame — `layout: "bare"` renders the body alone — and leaves the
 * body unpadded so a landing page can lay out full-width.
 */
export async function StaticPage({
  page,
  site,
  i18n,
  locale,
  components: C,
  children,
}: StaticPageProps) {
  // Pagefind indexes only `data-pagefind-body` regions, so this wrapper is
  // what opts a page into search (STATIC-PAGES §11).
  const body = page.search ? <div data-pagefind-body>{children}</div> : children;
  if (page.layout === "bare") return body;

  const [homeHref, globalNavigation, searchEntries] = await Promise.all([
    getHomeRoute(locale).then((href) => href ?? `${site.basePath}/`),
    getGlobalNavigation(locale),
    getSearchIndex(locale),
  ]);

  const homeRoutes: Record<string, string | undefined> = {};
  if (i18n.enabled) {
    await Promise.all(
      i18n.locales.map(async (candidate) => {
        homeRoutes[candidate.urlLocale] = await getHomeRoute(candidate.urlLocale);
      }),
    );
  }
  const localeLinks = i18n.enabled
    ? resolveStaticPageLocaleLinks(page, i18n.locales, homeRoutes)
    : [];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--makit-color-background)] text-[var(--makit-color-foreground)]">
      <C.Header
        header={site.header}
        siteTitle={site.title}
        homeHref={homeHref}
        actions={
          <HeaderActions site={site} searchEntries={searchEntries} components={C}>
            <LocaleLinks links={localeLinks} />
          </HeaderActions>
        }
        globalNavigation={globalNavigation}
      />
      <main className="flex-1">{body}</main>
      <C.Footer footer={site.footer} />
    </div>
  );
}
