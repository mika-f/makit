import {
  getCollections,
  getGlobalNavigation,
  getHomeRoute,
  getSearchIndex,
} from "../data/loaders.js";
import type { GeneratedPage, I18nData, ResolvedNavNode, SiteData } from "../data/types.js";
import type { ThemeComponents } from "../theme/components.js";

export interface DocsPageProps {
  page: GeneratedPage;
  site: SiteData;
  i18n: I18nData;
  navigation: ResolvedNavNode[];
  /**
   * The resolved slot map (THEME §6). Every Page Slot receives it so that a
   * replacement can reuse the other slots, honoring their own overrides.
   * Build one with `resolveThemeComponents()` when rendering this component
   * outside the generated app.
   */
  components: ThemeComponents;
}

/** The standard theme's page shell (spec §38): header, sidebar, content, ToC, footer. */
export async function DocsPage({ page, site, i18n, navigation, components: C }: DocsPageProps) {
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
      <C.SearchDialog
        entries={searchEntries}
        pagefindEnabled={process.env.NODE_ENV === "production"}
        pagefindBundlePath={`${site.basePath}/pagefind/`}
      />
      <C.CollectionSwitcher
        collections={collections}
        currentCollectionId={page.collectionId}
        locale={page.locale}
      />
      {i18n.enabled && (
        <C.LocaleSwitcher
          page={page}
          locales={i18n.locales}
          missingPageBehavior={i18n.localeSwitcher.missingPage}
        />
      )}
      {site.theme.colorScheme === "system" && <C.ThemeToggle />}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[var(--makit-color-background)] text-[var(--makit-color-foreground)]">
      <C.Header
        header={site.header}
        siteTitle={site.title}
        homeHref={homeHref}
        actions={headerActions}
        globalNavigation={globalNavigation}
      />
      <div className={`mx-auto grid w-full max-w-[96rem] flex-1 grid-cols-1 ${shellColumns}`}>
        {page.sidebar && (
          <C.Sidebar navigation={navigation} currentRoute={page.route} components={C} />
        )}
        <main data-pagefind-body className="min-w-0 px-5 py-10 sm:px-8 md:py-14 lg:px-12 xl:px-14">
          <C.FallbackNotice page={page} i18n={i18n} />
          <C.Breadcrumbs items={page.breadcrumbs} />
          <C.PageHeader page={page} />
          <C.PageContent html={page.html} copyButton={site.markdown.code.copyButton} />
          <C.PrevNextLinks prev={prev} next={next} />
        </main>
        {page.tableOfContents && (
          <C.TableOfContents
            headings={page.headings}
            minDepth={site.markdown.tableOfContents.minDepth}
            maxDepth={site.markdown.tableOfContents.maxDepth}
            actions={
              <C.PageActions
                route={page.route}
                editUrl={page.isFallback ? undefined : page.editUrl}
                markdownEnabled={site.llms.enabled && !page.isFallback && !page.draft}
                placement="table-of-contents"
              />
            }
          />
        )}
      </div>
      <C.Footer footer={site.footer} />
    </div>
  );
}
