export {
  getAllStaticParams,
  getCollectionMap,
  getCollectionNavigation,
  getCollections,
  getGlobalNavigation,
  getHomeRoute,
  getLocalesData,
  getPageById,
  getPageForRoute,
  getPageMap,
  getRouteMap,
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
  GeneratedHeading,
  GeneratedMetadata,
  GeneratedPage,
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
  NavigationGroup,
  NavigationItem,
  PageMapEntry,
  PageTaxonomy,
  RootBehavior,
  RootLocaleOption,
  RouteMapEntry,
  SeoData,
  SiteData,
  ThemeData,
} from "./data/types.js";
export { buildPageMetadata, buildSiteMetadata } from "./metadata/build-metadata.js";

export { DocsPage } from "./components/docs-page.js";
export { NotFoundPage } from "./components/not-found-page.js";
export { RootPage } from "./components/root-page.js";
export { ThemeScript } from "./theme/theme-script.js";
export { ThemeVariables } from "./theme/theme-variables.js";

export { findPrevNext, flattenNavigation } from "./navigation/flatten.js";
