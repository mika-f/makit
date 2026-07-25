/**
 * Product — a Makit theme for product documentation: soft cards, pill
 * navigation, and a gradient home.
 *
 * Every export here is named after a theme slot (THEME §5); Makit picks the
 * matching ones out of this namespace and falls back to the standard theme
 * for the rest (THEME §9.5). Slots deliberately left to the standard theme:
 * `PageContent`, `PageActions`, `SearchDialog`, `CollectionSwitcher`,
 * `LocaleSwitcher`, `ThemeToggle`, `FallbackNotice`, `RootPage`,
 * `ThemeScript` — their rounded, variable-driven styling already matches this
 * theme.
 */
export { RootLayout } from "./components/root-layout.js";
export { DocsPage } from "./components/docs-page.js";
export { PortalHomePage } from "./components/portal-home-page.js";
export { NotFoundPage } from "./components/not-found-page.js";

export { Header } from "./components/header.js";
export { Sidebar } from "./components/sidebar.js";
export { NavigationItems } from "./components/navigation-items.js";
export { Breadcrumbs } from "./components/breadcrumbs.js";
export { PageHeader } from "./components/page-header.js";
export { PrevNextLinks } from "./components/prev-next-links.js";
export { TableOfContents } from "./components/table-of-contents.js";
export { Footer } from "./components/footer.js";
export { ThemeVariables } from "./components/theme-variables.js";
