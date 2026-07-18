import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import type { ExternalLinksConfig } from "../../types/config.js";

const ABSOLUTE_URL_RE = /^[a-z][a-z0-9+.-]*:/i;

function externalLinkIcon(): Element {
  return {
    type: "element",
    tagName: "svg",
    properties: {
      "aria-hidden": "true",
      className: ["makit-external-link-icon"],
      fill: "none",
      focusable: "false",
      stroke: "currentColor",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeWidth: "2",
      viewBox: "0 0 24 24",
    },
    // Matches Lucide's ExternalLink icon. Markdown is rendered to static HTML,
    // so a React component cannot be mounted at this stage.
    children: [
      { type: "element", tagName: "path", properties: { d: "M15 3h6v6" }, children: [] },
      { type: "element", tagName: "path", properties: { d: "M10 14 21 3" }, children: [] },
      {
        type: "element",
        tagName: "path",
        properties: { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" },
        children: [],
      },
    ],
  };
}

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
      node.children.push(externalLinkIcon());
    });
  };
}
