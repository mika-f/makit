export {
  getAllStaticParams,
  getLocalesData,
  getManifest,
  getNavigation,
  getPageById,
  getPageForRoute,
  getSiteData,
} from "./data/loaders.js";
export type {
  FallbackBehavior,
  FooterData,
  FooterLink,
  GeneratedAlternate,
  GeneratedHeading,
  GeneratedMetadata,
  GeneratedPage,
  HeaderData,
  HeaderLink,
  I18nData,
  LocaleData,
  Manifest,
  ManifestEntry,
  MissingPageBehavior,
  NavigationGroup,
  NavigationItem,
  RootBehavior,
  RootLocaleOption,
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
