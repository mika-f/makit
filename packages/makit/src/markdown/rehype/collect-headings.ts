import { toString as hastToString } from "hast-util-to-string";
import type { Element, Root } from "hast";
import type { VFile } from "vfile";
import { visit } from "unist-util-visit";
import type { GeneratedHeading } from "../../types/page.js";

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

/** Collects h1-h6 into `file.data.headings` (spec §23, §26). Run after `rehype-slug` so ids are present. */
export function rehypeCollectHeadings() {
  return (tree: Root, file: VFile) => {
    const headings: GeneratedHeading[] = [];
    visit(tree, "element", (node: Element) => {
      if (!HEADING_TAGS.has(node.tagName)) return;
      const id = typeof node.properties.id === "string" ? node.properties.id : "";
      headings.push({
        id,
        depth: Number(node.tagName.slice(1)),
        text: hastToString(node),
      });
    });
    file.data.headings = headings;
  };
}
