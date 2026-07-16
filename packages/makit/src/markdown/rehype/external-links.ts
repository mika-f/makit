import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import type { ExternalLinksConfig } from "../../types/config.js";

const ABSOLUTE_URL_RE = /^[a-z][a-z0-9+.-]*:/i;

function isExternal(href: string): boolean {
  return ABSOLUTE_URL_RE.test(href);
}

/** Adds `target`/`rel` to links pointing outside the site (spec §19.3). */
export function rehypeExternalLinks(config: Required<ExternalLinksConfig>) {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "a") return;
      const href = typeof node.properties.href === "string" ? node.properties.href : undefined;
      if (!href || !isExternal(href)) return;
      node.properties.target = config.target;
      // hast represents space-separated attribute values (like `rel`) as string arrays.
      node.properties.rel = config.rel.split(/\s+/).filter(Boolean);
    });
  };
}
