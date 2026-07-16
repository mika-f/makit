import type { NavigationGroup, NavigationItem } from "../types/config.js";
import type { GeneratedPage } from "../types/page.js";
import type { ResolvedConfig, ResolvedLocaleConfig } from "../types/resolved-config.js";
import { buildRoute } from "./routes.js";
import { humanizeSlug } from "./text.js";

interface TreeNode {
  page?: GeneratedPage;
  children: Map<string, TreeNode>;
}

function navItemTitle(page: GeneratedPage): string {
  return page.navigation?.title ?? page.title;
}

function pageOrder(page: GeneratedPage | undefined): number {
  return page?.order ?? Number.POSITIVE_INFINITY;
}

function insertIntoTree(root: TreeNode, segments: readonly string[], page: GeneratedPage): void {
  let node = root;
  for (const segment of segments) {
    let child = node.children.get(segment);
    if (!child) {
      child = { children: new Map() };
      node.children.set(segment, child);
    }
    node = child;
  }
  node.page = page;
}

function sortChildEntries(entries: [string, TreeNode][]): [string, TreeNode][] {
  return entries.sort(([keyA, a], [keyB, b]) => {
    const orderDiff = pageOrder(a.page) - pageOrder(b.page);
    if (orderDiff !== 0) return orderDiff;
    const titleA = a.page ? navItemTitle(a.page) : humanizeSlug(keyA);
    const titleB = b.page ? navItemTitle(b.page) : humanizeSlug(keyB);
    return titleA.localeCompare(titleB);
  });
}

/** Builds nested `NavigationItem`s for one subtree (a directory's contents). */
function buildItemsFromNode(node: TreeNode): NavigationItem[] {
  const items: NavigationItem[] = [];
  for (const [segment, child] of sortChildEntries([...node.children.entries()])) {
    const hasChildren = child.children.size > 0;
    if (!hasChildren) {
      if (child.page) {
        items.push({ title: navItemTitle(child.page), href: child.page.route });
      }
      continue;
    }
    items.push({
      title: child.page ? navItemTitle(child.page) : humanizeSlug(segment),
      href: child.page?.route,
      items: buildItemsFromNode(child),
    });
  }
  return items;
}

/**
 * Builds the top-level `NavigationGroup[]` (spec §17.1). Unlike nested
 * `NavigationItem`s, a `NavigationGroup` has no `href` of its own — a
 * top-level directory's own index page (if any) is injected as that
 * group's first item so it stays reachable.
 */
function buildAutoNavigation(root: TreeNode): NavigationGroup[] {
  const ungrouped: NavigationItem[] = [];
  if (root.page) {
    ungrouped.push({ title: navItemTitle(root.page), href: root.page.route });
  }

  const groups: NavigationGroup[] = [];
  for (const [segment, child] of sortChildEntries([...root.children.entries()])) {
    const hasChildren = child.children.size > 0;
    if (!hasChildren) {
      if (child.page) {
        ungrouped.push({ title: navItemTitle(child.page), href: child.page.route });
      }
      continue;
    }
    const items: NavigationItem[] = [];
    if (child.page) {
      items.push({ title: navItemTitle(child.page), href: child.page.route });
    }
    items.push(...buildItemsFromNode(child));
    groups.push({ title: child.page ? navItemTitle(child.page) : humanizeSlug(segment), items });
  }

  const result: NavigationGroup[] = [];
  if (ungrouped.length > 0) result.push({ items: ungrouped });
  result.push(...groups);
  return result;
}

function isNavigablePage(page: GeneratedPage, config: ResolvedConfig): boolean {
  if (page.hidden) return false;
  if (page.isFallback && !config.navigation.includeFallbackPages) return false;
  return true;
}

/** Front matter `navigation.group` pulls a page out of the directory tree into a named top-level group (spec §14). */
function buildExplicitGroups(pages: readonly GeneratedPage[]): NavigationGroup[] {
  const byGroup = new Map<string, GeneratedPage[]>();
  for (const page of pages) {
    const groupTitle = page.navigation?.group;
    if (!groupTitle) continue;
    const list = byGroup.get(groupTitle) ?? [];
    list.push(page);
    byGroup.set(groupTitle, list);
  }

  const groups: NavigationGroup[] = [];
  for (const [title, groupPages] of byGroup) {
    const sorted = [...groupPages].sort((a, b) => {
      const orderDiff = pageOrder(a) - pageOrder(b);
      if (orderDiff !== 0) return orderDiff;
      return navItemTitle(a).localeCompare(navItemTitle(b));
    });
    groups.push({
      title,
      items: sorted.map((page) => ({ title: navItemTitle(page), href: page.route })),
    });
  }
  return groups;
}

function normalizeConfiguredHref(href: string): string[] {
  return href
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

/** Manual nav hrefs are locale-agnostic (spec §17.2); checks them against real routes for this locale. */
function validateManualNavigation(
  groups: readonly NavigationGroup[],
  knownRoutes: ReadonlySet<string>,
  config: ResolvedConfig,
  locale: ResolvedLocaleConfig,
  warnings: string[],
): void {
  const localePrefix = config.i18n.enabled ? locale.urlLocale : undefined;

  const visit = (items: readonly NavigationItem[]) => {
    for (const item of items) {
      if (item.href && !item.external) {
        const segments = normalizeConfiguredHref(item.href);
        const expectedRoute = buildRoute(segments, {
          basePath: config.basePath,
          localePrefix,
          trailingSlash: config.build.trailingSlash,
        });
        if (!knownRoutes.has(expectedRoute)) {
          warnings.push(
            `Navigation href "${item.href}" (locale "${locale.locale}") does not match any known page route.`,
          );
        }
      }
      if (item.items) visit(item.items);
    }
  };

  for (const group of groups) visit(group.items);
}

export interface GenerateNavigationResult {
  navigation: NavigationGroup[];
  warnings: string[];
}

/** Builds the navigation tree for one locale (spec §17). */
export function generateNavigation(
  pages: readonly GeneratedPage[],
  locale: ResolvedLocaleConfig,
  config: ResolvedConfig,
): GenerateNavigationResult {
  const warnings: string[] = [];
  const localePages = pages.filter((page) => page.locale === locale.urlLocale);

  if (config.navigation.mode === "manual") {
    const manualGroups =
      config.navigation.locales[locale.locale] ?? config.navigation.locales[locale.urlLocale] ?? [];
    const knownRoutes = new Set(localePages.map((page) => page.route));
    validateManualNavigation(manualGroups, knownRoutes, config, locale, warnings);
    return { navigation: manualGroups, warnings };
  }

  const navigablePages = localePages.filter((page) => isNavigablePage(page, config));
  const treePages = navigablePages.filter((page) => !page.navigation?.group);

  const root: TreeNode = { children: new Map() };
  for (const page of treePages) {
    insertIntoTree(root, page.segments, page);
  }

  const navigation = [
    ...buildAutoNavigation(root),
    ...buildExplicitGroups(navigablePages.filter((page) => page.navigation?.group)),
  ];

  return { navigation, warnings };
}

export interface GenerateAllNavigationResult {
  byLocale: Record<string, NavigationGroup[]>;
  warnings: string[];
}

/** Runs {@link generateNavigation} for every configured locale. */
export function generateAllNavigation(
  pages: readonly GeneratedPage[],
  config: ResolvedConfig,
): GenerateAllNavigationResult {
  const byLocale: Record<string, NavigationGroup[]> = {};
  const warnings: string[] = [];

  for (const locale of config.i18n.locales) {
    const result = generateNavigation(pages, locale, config);
    byLocale[locale.urlLocale] = result.navigation;
    warnings.push(...result.warnings);
  }

  return { byLocale, warnings };
}
