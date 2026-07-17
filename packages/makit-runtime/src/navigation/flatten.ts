import type { ResolvedNavNode } from "../data/types.js";

export interface FlatNavigationEntry {
  title: string;
  href: string;
}

function flattenNodes(nodes: readonly ResolvedNavNode[], out: FlatNavigationEntry[]): void {
  for (const node of nodes) {
    if (node.type === "link") {
      if (!node.external) out.push({ title: node.title, href: node.href });
      continue;
    }
    if (node.href) out.push({ title: node.title ?? "", href: node.href });
    if (node.type === "section" || node.type === "group") flattenNodes(node.items, out);
  }
}

/** Flattens the nav tree into a single ordered list of internal, linkable entries. */
export function flattenNavigation(nodes: readonly ResolvedNavNode[]): FlatNavigationEntry[] {
  const out: FlatNavigationEntry[] = [];
  flattenNodes(nodes, out);
  return out;
}

export interface PrevNext {
  prev?: FlatNavigationEntry;
  next?: FlatNavigationEntry;
}

/**
 * Finds the previous/next entries around `currentRoute` in the flattened
 * nav order. `GeneratedPage.navigationPosition` (computed at build time,
 * canonical-position and `crossSection`-aware) is the source of truth for
 * `DocsPage`'s prev/next links — this helper remains for custom themes that
 * want a route-order lookup over the raw navigation tree.
 */
export function findPrevNext(nodes: readonly ResolvedNavNode[], currentRoute: string): PrevNext {
  const flat = flattenNavigation(nodes);
  const index = flat.findIndex((entry) => entry.href === currentRoute);
  if (index === -1) return {};
  return { prev: flat[index - 1], next: flat[index + 1] };
}
