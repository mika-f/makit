import {
  getCollections,
  getGlobalNavigation,
  getHomeRoute,
  getSearchIndex,
} from "../data/loaders.js";
import type { GeneratedPage, I18nData, ResolvedNavNode, SiteData } from "../data/types.js";
import { Breadcrumbs } from "./breadcrumbs.js";
import { CollectionSwitcher } from "./collection-switcher.js";
import { FallbackNotice } from "./fallback-notice.js";
import { Footer } from "./footer.js";
import { Header } from "./header.js";
import { LocaleSwitcher } from "./locale-switcher.js";
import { PageContent } from "./page-content.js";
import { PrevNextLinks } from "./prev-next-links.js";
import { SearchDialog } from "./search-dialog.js";
import { Sidebar } from "./sidebar.js";
import { TableOfContents } from "./table-of-contents.js";
import { ThemeToggle } from "./theme-toggle.js";

export interface DocsPageProps {
  page: GeneratedPage;
  site: SiteData;
  i18n: I18nData;
  navigation: ResolvedNavNode[];
}

/** The standard theme's page shell (spec §21.1): header, sidebar, content, ToC, footer. */
export async function DocsPage({ page, site, i18n, navigation }: DocsPageProps) {
  const [homeHref, collections, globalNavigation, searchEntries] = await Promise.all([
    getHomeRoute(page.locale).then((href) => href ?? `${site.basePath}/`),
    getCollections(),
    getGlobalNavigation(page.locale),
    getSearchIndex(page.locale),
  ]);

  const prev = page.navigationPosition?.prev;
  const next = page.navigationPosition?.next;
  const shellColumns = page.sidebar
    ? page.tableOfContents
      ? "md:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)_15rem]"
      : "md:grid-cols-[17rem_minmax(0,1fr)]"
    : page.tableOfContents
      ? "xl:grid-cols-[minmax(0,1fr)_15rem]"
      : "grid-cols-1";

  const headerActions = (
    <>
      <SearchDialog
        entries={searchEntries}
        pagefindEnabled={process.env.NODE_ENV === "production"}
        pagefindBundlePath={`${site.basePath}/pagefind/`}
      />
      <CollectionSwitcher
        collections={collections}
        currentCollectionId={page.collectionId}
        locale={page.locale}
      />
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
        globalNavigation={globalNavigation}
      />
      <div className={`mx-auto grid w-full max-w-[96rem] flex-1 grid-cols-1 ${shellColumns}`}>
        {page.sidebar && <Sidebar navigation={navigation} currentRoute={page.route} />}
        <main data-pagefind-body className="min-w-0 px-5 py-10 sm:px-8 md:py-14 lg:px-12 xl:px-14">
          <FallbackNotice page={page} i18n={i18n} />
          <Breadcrumbs items={page.breadcrumbs} />
          <h1 className="mb-4 text-4xl font-semibold tracking-[-0.035em] sm:text-[2.75rem] sm:leading-[1.1]">
            {page.title}
          </h1>
          {page.description && (
            <p className="mb-9 max-w-3xl text-lg leading-8 text-[var(--makit-color-subtle)]">
              {page.description}
            </p>
          )}
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
