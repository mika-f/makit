export {
  getAllStaticParams,
  getCollectionMap,
  getCollectionNavigation,
  getCollections,
  getGlobalNavigation,
  getHomeData,
  getHomeRoute,
  getLocalesData,
  getPageById,
  getPageForRoute,
  getPageMap,
  getRouteEntry,
  getRouteMap,
  getSearchIndex,
  getSiteData,
  getTranslationMap,
} from "./data/loaders.js";
export type {
  CollectionData,
  CollectionFallbackBehavior,
  FallbackBehavior,
  FooterData,
  FooterLink,
  GeneratedAlternate,
  GeneratedBreadcrumb,
  GeneratedHeading,
  GeneratedMetadata,
  GeneratedNavigationPosition,
  GeneratedPage,
  GeneratedPageLink,
  GlobalNavigationGroup,
  GlobalNavigationItem,
  HeaderData,
  HeaderLink,
  HomeData,
  I18nData,
  LocaleData,
  LocalePageMap,
  LocaleRouteMap,
  MissingPageBehavior,
  PageHierarchyNode,
  PageMapEntry,
  PageTaxonomy,
  PortalCollectionCard,
  PortalHomeData,
  ResolvedNavContainerNode,
  ResolvedNavLinkNode,
  ResolvedNavNode,
  ResolvedNavPageNode,
  RootBehavior,
  RootLocaleOption,
  RouteMapEntry,
  SearchEntry,
  SeoData,
  SiteData,
  ThemeData,
} from "./data/types.js";
export { buildPageMetadata, buildSiteMetadata } from "./metadata/build-metadata.js";

// Every theme slot's default implementation (THEME §5). A theme may import
// these to wrap or recompose the standard theme.
export { Breadcrumbs } from "./components/breadcrumbs.js";
export { CollectionSwitcher } from "./components/collection-switcher.js";
export { DocsPage } from "./components/docs-page.js";
export { FallbackNotice } from "./components/fallback-notice.js";
export { Footer } from "./components/footer.js";
export { Header } from "./components/header.js";
export { LocaleSwitcher } from "./components/locale-switcher.js";
export { NavigationItems } from "./components/navigation-items.js";
export { NotFoundPage } from "./components/not-found-page.js";
export { PageActions } from "./components/page-actions.js";
export { PageContent } from "./components/page-content.js";
export { PageHeader } from "./components/page-header.js";
export { PortalHomePage } from "./components/portal-home-page.js";
export { PrevNextLinks } from "./components/prev-next-links.js";
export { RootLayout } from "./components/root-layout.js";
export { RootPage } from "./components/root-page.js";
export { SearchDialog } from "./components/search-dialog.js";
export { Sidebar } from "./components/sidebar.js";
export { TableOfContents } from "./components/table-of-contents.js";
export { ThemeToggle } from "./components/theme-toggle.js";
export { ThemeScript } from "./theme/theme-script.js";
// Also re-exported from `./client`, which is where a Client Component should
// import it from (THEME §11).
export { THEME_STORAGE_KEY } from "./theme/storage-key.js";
export { AnalyticsScripts } from "./analytics/analytics-scripts.js";
export type { AnalyticsScriptsConfig } from "./analytics/analytics-scripts.js";
export { ThemeVariables } from "./theme/theme-variables.js";

// Slot Props are public API (THEME §3.3).
export type { BreadcrumbsProps } from "./components/breadcrumbs.js";
export type { CollectionSwitcherProps } from "./components/collection-switcher.js";
export type { DocsPageProps } from "./components/docs-page.js";
export type { FallbackNoticeProps } from "./components/fallback-notice.js";
export type { FooterProps } from "./components/footer.js";
export type { HeaderProps } from "./components/header.js";
export type { LocaleSwitcherProps } from "./components/locale-switcher.js";
export type { NavigationItemsProps } from "./components/navigation-items.js";
export type { NotFoundPageProps } from "./components/not-found-page.js";
export type { PageActionsProps } from "./components/page-actions.js";
export type { PageContentProps } from "./components/page-content.js";
export type { PageHeaderProps } from "./components/page-header.js";
export type { PortalHomePageProps } from "./components/portal-home-page.js";
export type { PrevNextLinksProps } from "./components/prev-next-links.js";
export type { RootLayoutProps } from "./components/root-layout.js";
export type { RootPageProps } from "./components/root-page.js";
export type { SearchDialogProps } from "./components/search-dialog.js";
export type { SidebarProps } from "./components/sidebar.js";
export type { TableOfContentsProps } from "./components/table-of-contents.js";
export type { ThemeToggleProps } from "./components/theme-toggle.js";
export type { ThemeScriptProps } from "./theme/theme-script.js";
export type { ThemeVariablesProps } from "./theme/theme-variables.js";

// Slot resolution (THEME §10.1, §12).
export {
  defaultThemeComponents,
  pickThemeSlots,
  resolveThemeComponents,
} from "./theme/components.js";
export type {
  ThemeComponentOverrides,
  ThemeComponents,
  ThemeSlotComponent,
} from "./theme/components.js";
export {
  OPTIONAL_THEME_SLOT_NAMES,
  THEME_PAGE_SLOT_NAMES,
  THEME_PART_SLOT_NAMES,
  THEME_SLOT_NAMES,
  THEME_SLOT_NAME_BY_FILE_NAME,
  isOptionalThemeSlotName,
  isThemeSlotName,
  themeSlotFileName,
} from "./theme/slot-names.js";
export type {
  OptionalThemeSlotName,
  ThemePageSlotName,
  ThemePartSlotName,
  ThemeSlotName,
} from "./theme/slot-names.js";

export { findPrevNext, flattenNavigation } from "./navigation/flatten.js";

export { negotiateLocale } from "./i18n/negotiate-locale.js";
export type { LocaleCandidate, NegotiateLocaleOptions } from "./i18n/negotiate-locale.js";
