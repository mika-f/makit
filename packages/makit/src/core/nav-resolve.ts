import { existsSync } from "node:fs";
import { join } from "node:path";
import fg from "fast-glob";
import type { Jiti } from "jiti";
import { loadMetadataFile } from "../metadata/loader.js";
import type { CategoryMetadata, NavigationMetadata, NavigationNode } from "../metadata/types.js";
import type { NavigationGroup, NavigationItem } from "../types/config.js";
import type { GeneratedPage } from "../types/page.js";
import type { ResolvedConfig, ResolvedLocaleConfig } from "../types/resolved-config.js";
import type { ResolvedCollection } from "./collections.js";
import { MakitError } from "./errors.js";
import { localizeValue } from "./localize.js";
import type { ResolvedNavContainerNode, ResolvedNavNode } from "./nav-nodes.js";
import { buildRoute } from "./routes.js";
import { humanizeSlug } from "./text.js";

export interface ResolveNavigationContext {
  pages: readonly GeneratedPage[];
  locale: ResolvedLocaleConfig;
  config: ResolvedConfig;
  collection: ResolvedCollection;
  collections: readonly ResolvedCollection[];
  jiti: Jiti;
}

export interface ResolveNavigationResult {
  items: ResolvedNavNode[];
  warnings: string[];
  /** Metadata files that participated (navigation.makit.ts / category.makit.ts), for watching. */
  metadataPaths: string[];
}

function isNavigable(page: GeneratedPage, ctx: ResolveNavigationContext): boolean {
  if (page.hidden) return false;
  if (page.isFallback) {
    const collectionConfig = ctx.config.navigation.collections[ctx.collection.id];
    const includeFallback =
      collectionConfig?.mode === "auto"
        ? (collectionConfig.includeFallbackPages ?? ctx.config.navigation.includeFallbackPages)
        : ctx.config.navigation.includeFallbackPages;
    if (!includeFallback) return false;
  }
  return true;
}

function navTitle(page: GeneratedPage): string {
  return page.navigation?.title ?? page.title;
}

// #region manual resolution (spec §14, §25)

function resolveManualNodes(
  nodes: readonly NavigationNode[],
  ctx: ResolveNavigationContext,
  pageById: ReadonlyMap<string, GeneratedPage>,
  visiting: Set<object>,
): ResolvedNavNode[] {
  const resolved: ResolvedNavNode[] = [];

  for (const node of nodes) {
    if (visiting.has(node)) {
      throw new MakitError(
        "navigation-circular",
        `Navigation for collection "${ctx.collection.id}" contains a circular node structure (spec §45).`,
      );
    }

    switch (node.type) {
      case "page": {
        const page = pageById.get(node.page);
        if (!page) {
          throw new MakitError(
            "missing-navigation-target",
            `Navigation for collection "${ctx.collection.id}" (locale "${ctx.locale.urlLocale}") references unknown page id "${node.page}" (spec §45).`,
          );
        }
        if (node.hidden || !isNavigable(page, ctx)) break;
        resolved.push({
          type: "page",
          pageId: page.pageId,
          title: node.title ?? navTitle(page),
          href: page.route,
        });
        break;
      }
      case "section":
      case "group": {
        let pageId: string | undefined;
        let href: string | undefined;
        const clickTarget = node.type === "section" ? node.page : undefined;
        if (clickTarget !== undefined) {
          const page = pageById.get(clickTarget);
          if (!page) {
            throw new MakitError(
              "missing-navigation-target",
              `Section "${node.title ?? node.id ?? "?"}" in collection "${ctx.collection.id}" references unknown page id "${clickTarget}" (spec §45).`,
            );
          }
          pageId = page.pageId;
          href = page.route;
        }
        visiting.add(node);
        const items = resolveManualNodes(node.items, ctx, pageById, visiting);
        visiting.delete(node);
        resolved.push({
          type: node.type,
          id: node.id,
          title: node.title,
          pageId,
          href,
          collapsible: node.collapsible ?? false,
          collapsed: node.collapsed ?? false,
          items,
        });
        break;
      }
      case "link":
        resolved.push({
          type: "link",
          title: node.title,
          href: node.href,
          external: node.external,
        });
        break;
      case "collection": {
        const target = ctx.collections.find((collection) => collection.id === node.collection);
        if (!target) {
          throw new MakitError(
            "missing-navigation-target",
            `Navigation for collection "${ctx.collection.id}" references unknown collection "${node.collection}" (spec §45).`,
          );
        }
        const title = node.title ?? target.locales[ctx.locale.urlLocale]?.title ?? target.id;
        resolved.push({
          type: "link",
          title,
          href: buildRoute([], {
            basePath: ctx.config.basePath,
            localePrefix: ctx.config.i18n.enabled ? ctx.locale.urlLocale : undefined,
            collectionSegments: target.pathSegments,
            trailingSlash: ctx.config.build.trailingSlash,
          }),
        });
        break;
      }
    }
  }

  return resolved;
}

export function resolveManualNavigation(
  nodes: readonly NavigationNode[],
  ctx: ResolveNavigationContext,
): ResolvedNavNode[] {
  const pageById = new Map(
    ctx.pages
      .filter(
        (page) => page.locale === ctx.locale.urlLocale && page.collectionId === ctx.collection.id,
      )
      .map((page) => [page.pageId, page]),
  );
  return resolveManualNodes(nodes, ctx, pageById, new Set());
}

// #endregion

// #region auto resolution (spec §15.3, §27)

interface CategoryEntry {
  metadata: CategoryMetadata;
  metadataPath: string;
}

async function scanCategories(
  dir: string,
  projectRoot: string,
  jiti: Jiti,
): Promise<Map<string, CategoryEntry>> {
  const byDir = new Map<string, CategoryEntry>();
  if (!existsSync(dir)) return byDir;

  const matches = await fg("**/category.makit.ts", { cwd: dir, absolute: false, dot: false });
  for (const relPath of matches.sort()) {
    const metadataPath = join(dir, relPath);
    const loaded = await loadMetadataFile<CategoryMetadata>(metadataPath, "category", {
      projectRoot,
      jiti,
    });
    const dirKey = relPath.split("/").slice(0, -1).join("/");
    byDir.set(dirKey, { metadata: loaded.value, metadataPath });
  }
  return byDir;
}

interface TreeNode {
  page?: GeneratedPage;
  children: Map<string, TreeNode>;
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

interface AutoContext extends ResolveNavigationContext {
  categories: Map<string, CategoryEntry>;
}

function categoryFor(dirKey: string, ctx: AutoContext): CategoryMetadata | undefined {
  return ctx.categories.get(dirKey)?.metadata;
}

function sortEntries(
  entries: [string, TreeNode][],
  parentKey: string,
  ctx: AutoContext,
): [string, TreeNode][] {
  const orderOf = ([segment, node]: [string, TreeNode]): number => {
    if (node.children.size > 0) {
      const dirKey = parentKey === "" ? segment : `${parentKey}/${segment}`;
      const category = categoryFor(dirKey, ctx);
      if (category?.order !== undefined) return category.order;
    }
    return node.page?.order ?? Number.POSITIVE_INFINITY;
  };
  const titleOf = ([segment, node]: [string, TreeNode]): string => {
    if (node.children.size > 0) {
      const dirKey = parentKey === "" ? segment : `${parentKey}/${segment}`;
      const categoryTitle = localizeValue(categoryFor(dirKey, ctx)?.title, ctx.locale);
      if (categoryTitle) return categoryTitle;
    }
    return node.page ? navTitle(node.page) : humanizeSlug(segment);
  };

  // Stable sort: order asc -> localized title -> file/directory name (spec §27).
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const orderDiff = orderOf(a.entry) - orderOf(b.entry);
      if (orderDiff !== 0) return orderDiff;
      const titleDiff = titleOf(a.entry).localeCompare(titleOf(b.entry), ctx.locale.lang);
      if (titleDiff !== 0) return titleDiff;
      const nameDiff = a.entry[0].localeCompare(b.entry[0]);
      if (nameDiff !== 0) return nameDiff;
      return a.index - b.index;
    })
    .map(({ entry }) => entry);
}

function buildAutoContainer(
  segment: string,
  dirKey: string,
  node: TreeNode,
  depth: number,
  ctx: AutoContext,
): ResolvedNavContainerNode | undefined {
  const category = categoryFor(dirKey, ctx);
  if (category?.hidden) return undefined;

  // Directory depth decides section vs group by default: top-level
  // directories are the collection's major divisions (spec §7.3-7.4).
  const type = category?.type ?? (depth === 1 ? "section" : "group");
  const title =
    localizeValue(category?.title, ctx.locale) ??
    (node.page ? navTitle(node.page) : humanizeSlug(segment));

  const items: ResolvedNavNode[] = [];
  if (node.page) {
    items.push({
      type: "page",
      pageId: node.page.pageId,
      title: navTitle(node.page),
      href: node.page.route,
    });
  }
  items.push(...buildAutoItems(node, dirKey, depth, ctx));

  return {
    type,
    id: category?.id ?? segment,
    title,
    pageId: node.page?.pageId,
    href: node.page?.route,
    collapsible: category?.collapsible ?? false,
    collapsed: category?.collapsed ?? false,
    items,
  };
}

function buildAutoItems(
  node: TreeNode,
  parentKey: string,
  depth: number,
  ctx: AutoContext,
): ResolvedNavNode[] {
  const items: ResolvedNavNode[] = [];
  for (const [segment, child] of sortEntries([...node.children.entries()], parentKey, ctx)) {
    const dirKey = parentKey === "" ? segment : `${parentKey}/${segment}`;
    if (child.children.size === 0) {
      if (child.page) {
        items.push({
          type: "page",
          pageId: child.page.pageId,
          title: navTitle(child.page),
          href: child.page.route,
        });
      }
      continue;
    }
    const container = buildAutoContainer(segment, dirKey, child, depth + 1, ctx);
    if (container) items.push(container);
  }
  return items;
}

export async function resolveAutoNavigation(
  ctx: ResolveNavigationContext,
): Promise<{ items: ResolvedNavNode[]; metadataPaths: string[] }> {
  const collectionLocale =
    ctx.collection.locales[ctx.locale.urlLocale] ??
    // Whole-collection fallback locales reuse the default locale's structure.
    ctx.collection.locales[
      ctx.config.i18n.locales.find((l) => l.locale === ctx.config.i18n.defaultLocale)?.urlLocale ??
        ""
    ];

  const categories = collectionLocale
    ? await scanCategories(collectionLocale.dir, ctx.config.root, ctx.jiti)
    : new Map<string, CategoryEntry>();
  const autoCtx: AutoContext = { ...ctx, categories };

  const localePages = ctx.pages.filter(
    (page) =>
      page.locale === ctx.locale.urlLocale &&
      page.collectionId === ctx.collection.id &&
      isNavigable(page, ctx),
  );

  const root: TreeNode = { children: new Map() };
  for (const page of localePages) {
    insertIntoTree(root, page.pathSegments, page);
  }

  const items: ResolvedNavNode[] = [];
  if (root.page) {
    items.push({
      type: "page",
      pageId: root.page.pageId,
      title: navTitle(root.page),
      href: root.page.route,
    });
  }
  items.push(...buildAutoItems(root, "", 0, autoCtx));

  return {
    items,
    metadataPaths: [...categories.values()].map((entry) => entry.metadataPath),
  };
}

// #endregion

// #region legacy site-level manual config (v0.1, spec §48 compat)

function legacyItemToNode(
  item: NavigationItem,
  routeToPage: ReadonlyMap<string, GeneratedPage>,
): ResolvedNavNode {
  if (item.items && item.items.length > 0) {
    return {
      type: "group",
      title: item.title,
      href: item.href,
      pageId: item.href ? routeToPage.get(item.href)?.pageId : undefined,
      collapsible: false,
      collapsed: false,
      items: item.items.map((child) => legacyItemToNode(child, routeToPage)),
    };
  }
  const page = item.href && !item.external ? routeToPage.get(item.href) : undefined;
  if (page) {
    return { type: "page", pageId: page.pageId, title: item.title, href: page.route };
  }
  return { type: "link", title: item.title, href: item.href ?? "#", external: item.external };
}

/** Converts the v0.1 `navigation.locales` group shape into resolved nodes. */
export function resolveLegacyManualNavigation(
  groups: readonly NavigationGroup[],
  ctx: ResolveNavigationContext,
): { items: ResolvedNavNode[]; warnings: string[] } {
  const warnings: string[] = [];
  const localePages = ctx.pages.filter(
    (page) => page.locale === ctx.locale.urlLocale && page.collectionId === ctx.collection.id,
  );
  const routeToPage = new Map(localePages.map((page) => [page.route, page]));
  // Manual hrefs are written locale-agnostically (e.g. "/getting-started");
  // also index them with the locale prefix applied.
  for (const page of localePages) {
    const bare = buildRoute(page.segments, {
      basePath: ctx.config.basePath,
      trailingSlash: ctx.config.build.trailingSlash,
    });
    if (!routeToPage.has(bare)) routeToPage.set(bare, page);
    const bareNoSlash = bare.replace(/\/$/, "");
    if (bareNoSlash && !routeToPage.has(bareNoSlash)) routeToPage.set(bareNoSlash, page);
  }

  const visit = (items: readonly NavigationItem[]): void => {
    for (const item of items) {
      if (item.href && !item.external && !routeToPage.has(item.href)) {
        warnings.push(
          `Navigation href "${item.href}" (locale "${ctx.locale.locale}") does not match any known page route.`,
        );
      }
      if (item.items) visit(item.items);
    }
  };
  for (const group of groups) visit(group.items);

  const items: ResolvedNavNode[] = groups.map((group) => ({
    type: "section",
    title: group.title,
    collapsible: false,
    collapsed: false,
    items: group.items.map((item) => legacyItemToNode(item, routeToPage)),
  }));

  return { items, warnings };
}

// #endregion

/**
 * Resolves one (locale, collection) navigation with the spec §25 priority:
 * explicit config > `navigation.makit.ts` > auto. Configuring `manual` in
 * `makit.config.ts` while a `navigation.makit.ts` exists is an error.
 */
export async function resolveCollectionNavigation(
  ctx: ResolveNavigationContext,
): Promise<ResolveNavigationResult> {
  const configNav = ctx.config.navigation.collections[ctx.collection.id];

  const localeDir = ctx.collection.locales[ctx.locale.urlLocale]?.dir;
  const defaultLocaleDir =
    ctx.collection.locales[
      ctx.config.i18n.locales.find((l) => l.locale === ctx.config.i18n.defaultLocale)?.urlLocale ??
        ""
    ]?.dir;
  const navFileCandidates = [localeDir, defaultLocaleDir]
    .filter((dir): dir is string => dir !== undefined)
    .map((dir) => join(dir, "navigation.makit.ts"));
  const navFilePath = navFileCandidates.find((path) => existsSync(path));

  if (configNav?.mode === "manual") {
    if (navFilePath) {
      throw new MakitError(
        "navigation-source-conflict",
        `Collection "${ctx.collection.id}" has manual navigation in makit.config.ts AND a navigation.makit.ts (${navFilePath}). Use one source (spec §25).`,
      );
    }
    return {
      items: resolveManualNavigation(configNav.items, ctx),
      warnings: [],
      metadataPaths: [],
    };
  }

  if (navFilePath && configNav?.mode !== "auto") {
    const loaded = await loadMetadataFile<NavigationMetadata>(navFilePath, "navigation", {
      projectRoot: ctx.config.root,
      jiti: ctx.jiti,
    });
    return {
      items: resolveManualNavigation(loaded.value.items, ctx),
      warnings: loaded.warnings.map((warning) => warning.message),
      metadataPaths: [navFilePath, ...loaded.dependencies],
    };
  }

  // v0.1 site-level manual navigation applies to the implicit collection only.
  if (ctx.config.navigation.mode === "manual" && ctx.collection.implicit) {
    const groups =
      ctx.config.navigation.locales[ctx.locale.locale] ??
      ctx.config.navigation.locales[ctx.locale.urlLocale] ??
      [];
    const { items, warnings } = resolveLegacyManualNavigation(groups, ctx);
    return { items, warnings, metadataPaths: [] };
  }

  const { items, metadataPaths } = await resolveAutoNavigation(ctx);
  return { items, warnings: [], metadataPaths };
}
