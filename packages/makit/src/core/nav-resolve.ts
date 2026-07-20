import { existsSync } from "node:fs";
import { join } from "node:path";
import fg from "fast-glob";
import type { Jiti } from "jiti";
import { loadMetadataFile, metadataLoadDiagnostics } from "../metadata/loader.js";
import type { CategoryMetadata, NavigationMetadata, NavigationNode } from "../metadata/types.js";
import type { NavigationGroup, NavigationItem } from "../types/config.js";
import type { GeneratedPage } from "../types/page.js";
import type { ResolvedConfig, ResolvedLocaleConfig } from "../types/resolved-config.js";
import type { MetadataCache } from "./cache.js";
import type { ResolvedCollection } from "./collections.js";
import { MakitError } from "./errors.js";
import { localizeValue } from "./localize.js";
import type { ResolvedNavContainerNode, ResolvedNavNode } from "./nav-nodes.js";
import type { ParsedSegment, RouteGroupsMode } from "./routes.js";
import { buildRoute, parseSegmentName } from "./routes.js";
import { humanizeSlug } from "./text.js";
import type { Diagnostic } from "./validation.js";

export interface ResolveNavigationContext {
  pages: readonly GeneratedPage[];
  locale: ResolvedLocaleConfig;
  config: ResolvedConfig;
  collection: ResolvedCollection;
  collections: readonly ResolvedCollection[];
  jiti: Jiti;
  metadataCache?: MetadataCache;
}

export interface ResolveNavigationResult {
  items: ResolvedNavNode[];
  warnings: string[];
  diagnostics: Diagnostic[];
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

/** Drops segments that are route groups under `"flatten"` mode (ROUTE-GROUPS §9) — they form no tree node. */
function dropFlattenedSegments(
  parts: readonly ParsedSegment[],
  routeGroups: RouteGroupsMode,
): ParsedSegment[] {
  return routeGroups === "flatten" ? parts.filter((part) => !part.isRouteGroup) : [...parts];
}

/**
 * Normalizes a raw (possibly prefixed, possibly route-grouped) directory
 * path into the tree's dirKey (ORDER-PREFIX §4, §12; ROUTE-GROUPS §7, §9).
 */
function normalizeDirKey(
  rawDirPath: string,
  numericPrefixes: boolean,
  routeGroups: RouteGroupsMode,
  sourcePath: string,
): string {
  const rawParts = rawDirPath.split("/").filter((part) => part.length > 0);
  const parsed = rawParts.map((part) => parseSegmentName(part, sourcePath, { numericPrefixes, routeGroups }));
  return dropFlattenedSegments(parsed, routeGroups)
    .map((part) => part.name)
    .join("/");
}

async function scanCategories(
  dir: string,
  projectRoot: string,
  jiti: Jiti,
  metadataCache: MetadataCache | undefined,
  numericPrefixes: boolean,
  routeGroups: RouteGroupsMode,
): Promise<{ byDir: Map<string, CategoryEntry>; diagnostics: Diagnostic[] }> {
  const byDir = new Map<string, CategoryEntry>();
  const diagnostics: Diagnostic[] = [];
  if (!existsSync(dir)) return { byDir, diagnostics };

  const matches = await fg("**/category.makit.ts", { cwd: dir, absolute: false, dot: false });
  for (const relPath of matches.sort()) {
    const metadataPath = join(dir, relPath);
    const loaded = await loadMetadataFile<CategoryMetadata>(metadataPath, "category", {
      projectRoot,
      jiti,
      cache: metadataCache,
    });
    diagnostics.push(...metadataLoadDiagnostics(loaded));
    const rawDirPath = relPath.split("/").slice(0, -1).join("/");
    const rawParts = rawDirPath.split("/").filter((part) => part.length > 0);
    const ownName = rawParts[rawParts.length - 1];
    const ownParsed =
      ownName !== undefined
        ? parseSegmentName(ownName, metadataPath, { numericPrefixes, routeGroups })
        : undefined;
    if (routeGroups === "flatten" && ownParsed?.isRouteGroup) {
      // The directory itself forms no tree node under "flatten" mode, so
      // there is nothing for this category to attach to (ROUTE-GROUPS §9).
      diagnostics.push({
        code: "route-group-category-ignored",
        message:
          `"${relPath}" (${metadataPath}) is inside a route group with routeGroups: "flatten", ` +
          "which has no navigation node to attach to. This category.makit.ts is ignored.",
      });
      continue;
    }
    const dirKey = normalizeDirKey(rawDirPath, numericPrefixes, routeGroups, metadataPath);
    byDir.set(dirKey, { metadata: loaded.value, metadataPath });
  }
  return { byDir, diagnostics };
}

/**
 * Lists every directory under `dir` and maps its normalized dirKey to the
 * numeric ordering prefix on its own (deepest) segment, for use as a
 * directory's navigation order fallback (ORDER-PREFIX §12, §19). Two raw
 * directory paths that normalize to the same dirKey are a build error
 * (ORDER-PREFIX §22; ROUTE-GROUPS §7) — they would otherwise silently merge
 * into one navigation node. Runs whenever either normalization affects
 * directory names, so a bare `foo` and a route group `(foo)` colliding is
 * still caught even with `numericPrefixes` disabled.
 */
async function scanDirectoryOrders(
  dir: string,
  numericPrefixes: boolean,
  routeGroups: RouteGroupsMode,
): Promise<Map<string, number>> {
  const orders = new Map<string, number>();
  if ((!numericPrefixes && routeGroups === false) || !existsSync(dir)) return orders;

  const rawDirPaths: string[] = await fg("**", { cwd: dir, onlyDirectories: true, dot: false });
  const seenRawByKey = new Map<string, string>();

  for (const rawDirPath of rawDirPaths.sort()) {
    const sourcePath = join(dir, rawDirPath);
    const rawParts = rawDirPath.split("/").filter((part) => part.length > 0);
    const parsedParts = rawParts.map((part) =>
      parseSegmentName(part, sourcePath, { numericPrefixes, routeGroups }),
    );

    // A directory flattened away under "flatten" mode forms no container of
    // its own — it's a transparent pass-through whose children surface under
    // the same dirKey as its nearest real ancestor, so it isn't a competing
    // node and must not participate in the collision check below (its
    // descendants are still visited as their own entries in this walk).
    const own = parsedParts[parsedParts.length - 1];
    if (own?.isRouteGroup && routeGroups === "flatten") continue;

    const dirKey = dropFlattenedSegments(parsedParts, routeGroups)
      .map((part) => part.name)
      .join("/");

    const existingRaw = seenRawByKey.get(dirKey);
    if (existingRaw !== undefined && existingRaw !== rawDirPath) {
      throw new MakitError(
        "duplicate-normalized-directory",
        `Directories "${existingRaw}" and "${rawDirPath}" under "${dir}" both normalize to ` +
          `"${dirKey}".`,
      );
    }
    seenRawByKey.set(dirKey, rawDirPath);

    if (!numericPrefixes) continue;
    if (own?.order !== undefined) orders.set(dirKey, own.order);
  }

  return orders;
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
  /** Numeric ordering prefix on each directory's own name, keyed by normalized dirKey (ORDER-PREFIX §12). */
  directoryOrders: Map<string, number>;
  /** Mutated in place by `sortEntries` to collect duplicate-order warnings (ORDER-PREFIX §10). */
  diagnostics: Diagnostic[];
}

function categoryFor(dirKey: string, ctx: AutoContext): CategoryMetadata | undefined {
  return ctx.categories.get(dirKey)?.metadata;
}

/** The tier-3 fallback rank for items with no explicit order or numeric prefix (ORDER-PREFIX §9). */
function unorderedRank(ctx: AutoContext): number {
  return ctx.config.navigation.auto.unorderedPosition === "first"
    ? Number.NEGATIVE_INFINITY
    : Number.POSITIVE_INFINITY;
}

function sortEntries(
  entries: [string, TreeNode][],
  parentKey: string,
  ctx: AutoContext,
): [string, TreeNode][] {
  const numericPrefixes = ctx.config.navigation.auto.numericPrefixes;

  // Priority chain (ORDER-PREFIX §7): explicit metadata order -> numeric
  // filename/directory prefix -> localized title -> stripped name -> path.
  const orderOf = ([segment, node]: [string, TreeNode]): number => {
    const dirKey = parentKey === "" ? segment : `${parentKey}/${segment}`;
    if (node.children.size > 0) {
      const category = categoryFor(dirKey, ctx);
      const explicit = category?.order ?? node.page?.order;
      if (explicit !== undefined) return explicit;
      if (numericPrefixes) {
        const prefixOrder = ctx.directoryOrders.get(dirKey) ?? node.page?.filenameOrder;
        if (prefixOrder !== undefined) return prefixOrder;
      }
      return unorderedRank(ctx);
    }
    if (node.page?.order !== undefined) return node.page.order;
    if (numericPrefixes && node.page?.filenameOrder !== undefined) return node.page.filenameOrder;
    return unorderedRank(ctx);
  };
  const titleOf = ([segment, node]: [string, TreeNode]): string => {
    if (node.children.size > 0) {
      const dirKey = parentKey === "" ? segment : `${parentKey}/${segment}`;
      const categoryTitle = localizeValue(categoryFor(dirKey, ctx)?.title, ctx.locale);
      if (categoryTitle) return categoryTitle;
    }
    return node.page ? navTitle(node.page) : humanizeSlug(segment);
  };

  const withOrder = entries.map((entry, index) => ({ entry, index, order: orderOf(entry) }));

  // Duplicate finite order values among siblings are a warning, not an
  // error — the stable sort below still produces a deterministic order
  // (ORDER-PREFIX §10).
  const seenOrders = new Map<number, string>();
  for (const { entry, order } of withOrder) {
    if (!Number.isFinite(order)) continue;
    const existing = seenOrders.get(order);
    if (existing !== undefined) {
      ctx.diagnostics.push({
        code: "duplicate-navigation-order",
        message:
          `Duplicate navigation order ${order} in "${parentKey || "/"}": ` +
          `"${existing}" and "${entry[0]}" (ORDER-PREFIX §10).`,
      });
    } else {
      seenOrders.set(order, entry[0]);
    }
  }

  // Stable sort: order asc -> localized title -> file/directory name (spec §27).
  return withOrder
    .sort((a, b) => {
      const orderDiff = a.order - b.order;
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
): Promise<{ items: ResolvedNavNode[]; metadataPaths: string[]; diagnostics: Diagnostic[] }> {
  const collectionLocale =
    ctx.collection.locales[ctx.locale.urlLocale] ??
    // Whole-collection fallback locales reuse the default locale's structure.
    ctx.collection.locales[
      ctx.config.i18n.locales.find((l) => l.locale === ctx.config.i18n.defaultLocale)?.urlLocale ??
        ""
    ];

  const numericPrefixes = ctx.config.navigation.auto.numericPrefixes;
  const routeGroups = ctx.config.navigation.auto.routeGroups;
  const { byDir: categories, diagnostics } = collectionLocale
    ? await scanCategories(
        collectionLocale.dir,
        ctx.config.root,
        ctx.jiti,
        ctx.metadataCache,
        numericPrefixes,
        routeGroups,
      )
    : { byDir: new Map<string, CategoryEntry>(), diagnostics: [] as Diagnostic[] };
  const directoryOrders = collectionLocale
    ? await scanDirectoryOrders(collectionLocale.dir, numericPrefixes, routeGroups)
    : new Map<string, number>();
  const autoCtx: AutoContext = { ...ctx, categories, directoryOrders, diagnostics: [] };

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
    diagnostics: [...diagnostics, ...autoCtx.diagnostics],
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
      diagnostics: [],
      metadataPaths: [],
    };
  }

  if (navFilePath && configNav?.mode !== "auto") {
    const loaded = await loadMetadataFile<NavigationMetadata>(navFilePath, "navigation", {
      projectRoot: ctx.config.root,
      jiti: ctx.jiti,
      cache: ctx.metadataCache,
    });
    return {
      items: resolveManualNavigation(loaded.value.items, ctx),
      warnings: [],
      diagnostics: metadataLoadDiagnostics(loaded),
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
    return { items, warnings, diagnostics: [], metadataPaths: [] };
  }

  const { items, metadataPaths, diagnostics } = await resolveAutoNavigation(ctx);
  return { items, warnings: [], diagnostics, metadataPaths };
}
