import type { Element, Parent, Root } from "hast";
import { visit } from "unist-util-visit";

/**
 * Wraps `<table>` elements in a scrollable container so wide tables scroll
 * horizontally on their own instead of forcing the whole page to scroll
 * (spec §19.3). The table itself keeps its natural (unconstrained) width;
 * only the wrapper is clipped.
 */
export function rehypeWrapTables() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent: Parent | undefined) => {
      if (node.tagName !== "table" || !parent || index === undefined) return;

      const wrapper: Element = {
        type: "element",
        tagName: "div",
        properties: { className: ["makit-table-wrapper"] },
        children: [node],
      };
      parent.children[index] = wrapper;
    });
  };
}
