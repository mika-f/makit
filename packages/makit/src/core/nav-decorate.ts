import type {
  GeneratedBreadcrumb,
  GeneratedPage,
  GeneratedPageLink,
  PageHierarchyNode,
} from "../types/page.js";
import type { ResolvedConfig, ResolvedLocaleConfig } from "../types/resolved-config.js";
import type { ResolvedCollection } from "./collections.js";
import { MakitError } from "./errors.js";
import type { ResolvedNavContainerNode, ResolvedNavNode } from "./nav-nodes.js";
import { buildRoute } from "./routes.js";
import { slugify } from "./text.js";
import type { Diagnostic } from "./validation.js";

interface Occurrence {
  pageId: string;
  title: string;
  href: string;
  /** Section/group ancestors, root-first. */
  ancestors: ResolvedNavContainerNode[];
}

/** The `navigation.primary` matching key of a container (spec §30): its `id`, else its slugified title. */
function containerKey(node: ResolvedNavContainerNode): string {
  return node.id ?? (node.title ? slugify(node.title) : "");
}

function collectOccurrences(
  nodes: readonly ResolvedNavNode[],
  ancestors: ResolvedNavContainerNode[],
  out: Occurrence[],
): void {
  for (const node of nodes) {
    if (node.type === "page") {
      out.push({ pageId: node.pageId, title: node.title, href: node.href, ancestors: [...ancestors] });
    } else if (node.type === "section" || node.type === "group") {
      // A clickable container counts as an occurrence of its page too.
      if (node.pageId && node.href) {
        out.push({
          pageId: node.pageId,
          title: node.title ?? node.pageId,
          href: node.href,
          ancestors: [...ancestors],
        });
      }
      collectOccurrences(node.items, [...ancestors, node], out);
    }
  }
}

function matchesPrimary(occurrence: Occurrence, primary: readonly string[]): boolean {
  const keys = occurrence.ancestors.map(containerKey);
  if (keys.length !== primary.length) return false;
  return primary.every((expected, index) => keys[index] === expected);
}

export interface DecorateNavigationResult {
  pages: GeneratedPage[];
  diagnostics: Diagnostic[];
}

/**
 * Decorates pages with their canonical navigation position, breadcrumbs,
 * hierarchy, and prev/next links, derived from the resolved navigation
 * trees (spec §30, §31, §32, §39).
 */
export function decoratePagesWithNavigation(
  pages: readonly GeneratedPage[],
  navigationByLocale: Readonly<Record<string, Record<string, ResolvedNavNode[]>>>,
  config: ResolvedConfig,
  collections: readonly ResolvedCollection[],
): DecorateNavigationResult {
  const diagnostics: Diagnostic[] = [];
  const collectionById = new Map(collections.map((collection) => [collection.id, collection]));
  const localeByUrl = new Map(config.i18n.locales.map((locale) => [locale.urlLocale, locale]));

  // Canonical occurrence per (locale, collection, pageId).
  const canonical = new Map<string, { occurrence: Occurrence; index: number }>();
  // Canonical flat order per (locale, collection) for prev/next.
  const flatOrders = new Map<string, Occurrence[]>();
  const pageByKey = new Map(
    pages.map((page) => [`${page.locale}:${page.collectionId}:${page.pageId}`, page]),
  );

  for (const [urlLocale, byCollection] of Object.entries(navigationByLocale)) {
    for (const [collectionId, nodes] of Object.entries(byCollection)) {
      const occurrences: Occurrence[] = [];
      collectOccurrences(nodes, [], occurrences);

      const byPageId = new Map<string, Occurrence[]>();
      for (const occurrence of occurrences) {
        const list = byPageId.get(occurrence.pageId) ?? [];
        list.push(occurrence);
        byPageId.set(occurrence.pageId, list);
      }

      const canonicalOrder: Occurrence[] = [];
      const canonicalChosen = new Map<string, Occurrence>();
      for (const [pageId, list] of byPageId) {
        const page = pageByKey.get(`${urlLocale}:${collectionId}:${pageId}`);
        const primary = page?.navigation?.primary;
        let chosen = list[0]!;
        if (primary && primary.length > 0) {
          const match = list.find((occurrence) => matchesPrimary(occurrence, primary));
          if (!match) {
            throw new MakitError(
              "missing-primary-position",
              `Page "${pageId}" (locale "${urlLocale}", collection "${collectionId}") declares navigation.primary [${primary.join(", ")}] but no matching navigation position exists (spec §45).`,
            );
          }
          chosen = match;
        } else if (list.length > 1 && page && !page.isFallback) {
          diagnostics.push({
            code: "multiple-placement-without-primary",
            message: `Page "${pageId}" appears at ${list.length} navigation positions without a canonical \`navigation.primary\` — the first occurrence is used (spec §30)`,
            sourcePath: page.sourcePath,
          });
        }
        canonicalChosen.set(pageId, chosen);
      }
      // Flat order preserves tree walk order, each page at its canonical slot.
      const seen = new Set<string>();
      for (const occurrence of occurrences) {
        if (seen.has(occurrence.pageId)) continue;
        if (canonicalChosen.get(occurrence.pageId) !== occurrence) continue;
        seen.add(occurrence.pageId);
        canonicalOrder.push(occurrence);
      }

      flatOrders.set(`${urlLocale}:${collectionId}`, canonicalOrder);
      canonicalOrder.forEach((occurrence, index) => {
        canonical.set(`${urlLocale}:${collectionId}:${occurrence.pageId}`, { occurrence, index });
      });
    }
  }

  const pagination = config.navigation.pagination;
  const breadcrumbsConfig = config.theme.breadcrumbs;

  const decorated = pages.map((page): GeneratedPage => {
    const key = `${page.locale}:${page.collectionId}:${page.pageId}`;
    const entry = canonical.get(key);
    const collection = collectionById.get(page.collectionId);
    const locale = localeByUrl.get(page.locale);

    const hierarchy: PageHierarchyNode[] = [];
    if (collection && !collection.implicit && locale) {
      hierarchy.push({
        type: "collection",
        id: collection.id,
        title: collection.locales[page.locale]?.title ?? collection.id,
        href: buildRoute([], {
          basePath: config.basePath,
          localePrefix: config.i18n.enabled ? page.locale : undefined,
          collectionSegments: collection.pathSegments,
          trailingSlash: config.build.trailingSlash,
        }),
      });
    }
    if (entry) {
      for (const ancestor of entry.occurrence.ancestors) {
        hierarchy.push({
          type: ancestor.type,
          id: ancestor.id,
          title: ancestor.title ?? "",
          href: ancestor.href,
        });
      }
    }

    const breadcrumbs: GeneratedBreadcrumb[] = [];
    if (breadcrumbsConfig.enabled) {
      if (breadcrumbsConfig.showHome) {
        breadcrumbs.push({
          title: config.i18n.messages[page.locale]?.home ?? "Home",
          href: buildRoute([], {
            basePath: config.basePath,
            localePrefix: config.i18n.enabled ? page.locale : undefined,
            trailingSlash: config.build.trailingSlash,
          }),
        });
      }
      for (const node of hierarchy) {
        breadcrumbs.push({ title: node.title, href: node.href });
      }
      if (breadcrumbsConfig.showCurrentPage) {
        breadcrumbs.push({ title: page.title, href: page.route });
      }
    }

    let navigationPosition: GeneratedPage["navigationPosition"];
    if (entry) {
      const order = flatOrders.get(`${page.locale}:${page.collectionId}`) ?? [];
      const topSectionOf = (occurrence: Occurrence): string | undefined =>
        occurrence.ancestors.find((ancestor) => ancestor.type === "section")
          ? containerKey(occurrence.ancestors.find((ancestor) => ancestor.type === "section")!)
          : undefined;

      const toLink = (occurrence: Occurrence | undefined): GeneratedPageLink | undefined => {
        if (!occurrence) return undefined;
        if (!pagination.crossSection && topSectionOf(occurrence) !== topSectionOf(entry.occurrence)) {
          return undefined;
        }
        return { pageId: occurrence.pageId, title: occurrence.title, href: occurrence.href };
      };

      navigationPosition = {
        path: entry.occurrence.ancestors.map(containerKey),
        index: entry.index,
        prev: pagination.enabled ? toLink(order[entry.index - 1]) : undefined,
        next: pagination.enabled ? toLink(order[entry.index + 1]) : undefined,
      };
    }

    return { ...page, hierarchy, breadcrumbs, navigationPosition };
  });

  return { pages: decorated, diagnostics };
}
