import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbsProps } from "../components/breadcrumbs.js";
import {
  CollectionSwitcher,
  type CollectionSwitcherProps,
} from "../components/collection-switcher.js";
import { DocsPage, type DocsPageProps } from "../components/docs-page.js";
import { FallbackNotice, type FallbackNoticeProps } from "../components/fallback-notice.js";
import { Footer, type FooterProps } from "../components/footer.js";
import { Header, type HeaderProps } from "../components/header.js";
import { LocaleSwitcher, type LocaleSwitcherProps } from "../components/locale-switcher.js";
import { NavigationItems, type NavigationItemsProps } from "../components/navigation-items.js";
import { NotFoundPage, type NotFoundPageProps } from "../components/not-found-page.js";
import { PageActions, type PageActionsProps } from "../components/page-actions.js";
import { PageContent, type PageContentProps } from "../components/page-content.js";
import { PageHeader, type PageHeaderProps } from "../components/page-header.js";
import { PortalHomePage, type PortalHomePageProps } from "../components/portal-home-page.js";
import { PrevNextLinks, type PrevNextLinksProps } from "../components/prev-next-links.js";
import { RootLayout, type RootLayoutProps } from "../components/root-layout.js";
import { RootPage, type RootPageProps } from "../components/root-page.js";
import { SearchDialog, type SearchDialogProps } from "../components/search-dialog.js";
import { Sidebar, type SidebarProps } from "../components/sidebar.js";
import { TableOfContents, type TableOfContentsProps } from "../components/table-of-contents.js";
import { ThemeToggle, type ThemeToggleProps } from "../components/theme-toggle.js";
import { ThemeScript, type ThemeScriptProps } from "./theme-script.js";
import { ThemeVariables, type ThemeVariablesProps } from "./theme-variables.js";
import { THEME_SLOT_NAMES, type ThemeSlotName } from "./slot-names.js";

/**
 * A slot implementation: a function component, possibly `async` (a React
 * Server Component). Deliberately not `ComponentType`, which excludes class
 * components' async variants and adds ref/key machinery slots never use.
 */
export type ThemeSlotComponent<P> = (props: P) => ReactNode | Promise<ReactNode>;

/** Every slot's implementation, with defaults filled in (THEME §5). */
export interface ThemeComponents {
  RootLayout: ThemeSlotComponent<RootLayoutProps>;
  DocsPage: ThemeSlotComponent<DocsPageProps>;
  PortalHomePage: ThemeSlotComponent<PortalHomePageProps>;
  RootPage: ThemeSlotComponent<RootPageProps>;
  NotFoundPage: ThemeSlotComponent<NotFoundPageProps>;
  Header: ThemeSlotComponent<HeaderProps>;
  Footer: ThemeSlotComponent<FooterProps>;
  Sidebar: ThemeSlotComponent<SidebarProps>;
  NavigationItems: ThemeSlotComponent<NavigationItemsProps>;
  Breadcrumbs: ThemeSlotComponent<BreadcrumbsProps>;
  PageHeader: ThemeSlotComponent<PageHeaderProps>;
  PageContent: ThemeSlotComponent<PageContentProps>;
  PrevNextLinks: ThemeSlotComponent<PrevNextLinksProps>;
  TableOfContents: ThemeSlotComponent<TableOfContentsProps>;
  PageActions: ThemeSlotComponent<PageActionsProps>;
  SearchDialog: ThemeSlotComponent<SearchDialogProps>;
  CollectionSwitcher: ThemeSlotComponent<CollectionSwitcherProps>;
  LocaleSwitcher: ThemeSlotComponent<LocaleSwitcherProps>;
  ThemeToggle: ThemeSlotComponent<ThemeToggleProps>;
  FallbackNotice: ThemeSlotComponent<FallbackNoticeProps>;
  ThemeVariables: ThemeSlotComponent<ThemeVariablesProps>;
  ThemeScript: ThemeSlotComponent<ThemeScriptProps>;
}

/**
 * Slot overrides as written into `.makit/app/theme.js`: any subset of slots,
 * where `false` means "render nothing" (THEME §7.4). `undefined` values are
 * ignored so a generated module can pass a slot through unconditionally.
 */
export type ThemeComponentOverrides = {
  [K in ThemeSlotName]?: ThemeComponents[K] | false | undefined;
};

/** The standard theme (THEME §9.5). */
export const defaultThemeComponents: ThemeComponents = {
  RootLayout,
  DocsPage,
  PortalHomePage,
  RootPage,
  NotFoundPage,
  Header,
  Footer,
  Sidebar,
  NavigationItems,
  Breadcrumbs,
  PageHeader,
  PageContent,
  PrevNextLinks,
  TableOfContents,
  PageActions,
  SearchDialog,
  CollectionSwitcher,
  LocaleSwitcher,
  ThemeToggle,
  FallbackNotice,
  ThemeVariables,
  ThemeScript,
};

/** A disabled slot (`false` in `theme.components`). */
function DisabledSlot(): ReactNode {
  return null;
}

/**
 * Picks the slot-shaped exports out of a theme package's module namespace
 * (THEME §9.5). Themes are not required to implement every slot, and the CLI
 * cannot introspect a package's exports without loading React — so the
 * generated app spreads the whole namespace through here and everything
 * missing falls back to the standard theme.
 */
export function pickThemeSlots(namespace: Record<string, unknown>): ThemeComponentOverrides {
  const picked: Record<string, unknown> = {};
  for (const slot of THEME_SLOT_NAMES) {
    const value = namespace[slot];
    if (typeof value === "function" || value === false) picked[slot] = value;
  }
  return picked as ThemeComponentOverrides;
}

/**
 * Fills a partial slot map out to a complete one: missing slots take the
 * standard theme's implementation and `false` becomes a component that
 * renders nothing (THEME §10.1).
 */
export function resolveThemeComponents(overrides: ThemeComponentOverrides = {}): ThemeComponents {
  const resolved = { ...defaultThemeComponents } as Record<string, unknown>;
  for (const slot of THEME_SLOT_NAMES) {
    const override = overrides[slot];
    if (override === undefined) continue;
    resolved[slot] = override === false ? DisabledSlot : override;
  }
  return resolved as unknown as ThemeComponents;
}
