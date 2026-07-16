import type { NavigationGroup, NavigationItem } from "../data/types.js";

export interface FlatNavigationEntry {
  title: string;
  href: string;
}

function flattenItems(items: readonly NavigationItem[], out: FlatNavigationEntry[]): void {
  for (const item of items) {
    if (item.href && !item.external) {
      out.push({ title: item.title, href: item.href });
    }
    if (item.items) flattenItems(item.items, out);
  }
}

/** Flattens the nav tree into a single ordered list, for prev/next links (spec §21.1). */
export function flattenNavigation(groups: readonly NavigationGroup[]): FlatNavigationEntry[] {
  const out: FlatNavigationEntry[] = [];
  for (const group of groups) {
    flattenItems(group.items, out);
  }
  return out;
}

export interface PrevNext {
  prev?: FlatNavigationEntry;
  next?: FlatNavigationEntry;
}

/** Finds the previous/next entries around `currentRoute` in the flattened nav order. */
export function findPrevNext(groups: readonly NavigationGroup[], currentRoute: string): PrevNext {
  const flat = flattenNavigation(groups);
  const index = flat.findIndex((entry) => entry.href === currentRoute);
  if (index === -1) return {};
  return { prev: flat[index - 1], next: flat[index + 1] };
}
