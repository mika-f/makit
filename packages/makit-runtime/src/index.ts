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

export { Breadcrumbs } from "./components/breadcrumbs.js";
export { CollectionSwitcher } from "./components/collection-switcher.js";
export { DocsPage } from "./components/docs-page.js";
export { NotFoundPage } from "./components/not-found-page.js";
export { PortalHomePage } from "./components/portal-home-page.js";
export { RootPage } from "./components/root-page.js";
export { ThemeScript } from "./theme/theme-script.js";
export { ThemeVariables } from "./theme/theme-variables.js";

export { findPrevNext, flattenNavigation } from "./navigation/flatten.js";
