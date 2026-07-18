import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

const TABLE_ALIGNMENTS = new Set(["left", "center", "right"]);

/**
 * Converts GFM's deprecated table-cell `align` attribute into an inline CSS
 * declaration. Typography styles otherwise override the browser's alignment
 * hint from that attribute.
 */
export function rehypeTableCellAlign() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "th" && node.tagName !== "td") return;

      const align = node.properties.align;
      if (typeof align !== "string" || !TABLE_ALIGNMENTS.has(align)) return;

      const style = typeof node.properties.style === "string" ? node.properties.style.trim() : "";
      node.properties.style = `${style}${style && !style.endsWith(";") ? ";" : ""}text-align: ${align}`;
      delete node.properties.align;
    });
  };
}
