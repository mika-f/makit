/**
 * The resolved navigation tree written to `navigation/{locale}/{collection}.json`
 * and consumed by the runtime (spec §14, §25, §27). All page/collection
 * references are already resolved to concrete titles and hrefs.
 */
export type ResolvedNavNode = ResolvedNavPageNode | ResolvedNavContainerNode | ResolvedNavLinkNode;

export interface ResolvedNavPageNode {
  type: "page";
  pageId: string;
  title: string;
  href: string;
}

/** A section (major division) or group (logical grouping) — spec §7.3-7.4. */
export interface ResolvedNavContainerNode {
  type: "section" | "group";
  /** Used for `navigation.primary` matching (spec §30); auto mode uses the directory name. */
  id?: string;
  title?: string;
  /** Set when the container itself is clickable (spec §15.2 `index`, §14.2 `page`). */
  pageId?: string;
  href?: string;
  collapsible: boolean;
  collapsed: boolean;
  items: ResolvedNavNode[];
}

export interface ResolvedNavLinkNode {
  type: "link";
  title: string;
  href: string;
  external?: boolean;
}
