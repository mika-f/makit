import { getHomeRoute } from "../data/loaders.js";
import type { GeneratedPage, I18nData, NavigationGroup, SiteData } from "../data/types.js";
import { findPrevNext } from "../navigation/flatten.js";
import { FallbackNotice } from "./fallback-notice.js";
import { Footer } from "./footer.js";
import { Header } from "./header.js";
import { LocaleSwitcher } from "./locale-switcher.js";
import { PageContent } from "./page-content.js";
import { PrevNextLinks } from "./prev-next-links.js";
import { Sidebar } from "./sidebar.js";
import { TableOfContents } from "./table-of-contents.js";
import { ThemeToggle } from "./theme-toggle.js";

export interface DocsPageProps {
  page: GeneratedPage;
  site: SiteData;
  i18n: I18nData;
  navigation: NavigationGroup[];
}

/** The standard theme's page shell (spec §21.1): header, sidebar, content, ToC, footer. */
export async function DocsPage({ page, site, i18n, navigation }: DocsPageProps) {
  const homeHref = (await getHomeRoute(page.locale)) ?? `${site.basePath}/`;

  const { prev, next } = findPrevNext(navigation, page.route);

  const headerActions = (
    <>
      {i18n.enabled && (
        <LocaleSwitcher
          page={page}
          locales={i18n.locales}
          missingPageBehavior={i18n.localeSwitcher.missingPage}
        />
      )}
      {site.theme.colorScheme === "system" && <ThemeToggle />}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[var(--makit-color-background)] text-[var(--makit-color-foreground)]">
      <Header
        header={site.header}
        siteTitle={site.title}
        homeHref={homeHref}
        actions={headerActions}
      />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col md:flex-row">
        {page.sidebar && <Sidebar groups={navigation} currentRoute={page.route} />}
        <main className="min-w-0 flex-1 px-4 py-8 md:px-8">
          <FallbackNotice page={page} i18n={i18n} />
          <h1 className="mb-4 text-3xl font-bold">{page.title}</h1>
          <PageContent html={page.html} copyButton={site.markdown.code.copyButton} />
          <PrevNextLinks prev={prev} next={next} />
        </main>
        {page.tableOfContents && (
          <TableOfContents
            headings={page.headings}
            minDepth={site.markdown.tableOfContents.minDepth}
            maxDepth={site.markdown.tableOfContents.maxDepth}
          />
        )}
      </div>
      <Footer footer={site.footer} />
    </div>
  );
}
