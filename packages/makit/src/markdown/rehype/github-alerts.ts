import type { Element, Root, Text } from "hast";
import { visit } from "unist-util-visit";

const ALERT_TYPES = ["note", "tip", "important", "warning", "caution"] as const;

type AlertType = (typeof ALERT_TYPES)[number];

const ALERT_MARKER_RE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\n)?/;

function alertFor(node: Element): { type: AlertType; paragraph: Element } | undefined {
  if (node.tagName !== "blockquote") return undefined;
  const paragraph = node.children.find(
    (child): child is Element => child.type === "element" && child.tagName === "p",
  );
  if (!paragraph) return undefined;
  const firstText = paragraph.children[0];
  if (!firstText || firstText.type !== "text") return undefined;
  const match = firstText.value.match(ALERT_MARKER_RE);
  const marker = match?.[1];
  if (!marker) return undefined;
  const type = marker.toLowerCase() as AlertType;
  return ALERT_TYPES.includes(type) ? { type, paragraph } : undefined;
}

function removeMarker(paragraph: Element): void {
  const firstText = paragraph.children[0] as Text;
  firstText.value = firstText.value.replace(ALERT_MARKER_RE, "");
  if (firstText.value.length === 0) paragraph.children.shift();
}

function titleNode(type: AlertType): Element {
  return {
    type: "element",
    tagName: "p",
    properties: { className: ["makit-alert-title"] },
    children: [{ type: "text", value: type }],
  };
}

/** Converts GitHub's `[!TYPE]` blockquote syntax into a labelled alert. */
export function rehypeGitHubAlerts() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      const alert = alertFor(node);
      if (!alert) return;

      removeMarker(alert.paragraph);
      if (alert.paragraph.children.length === 0) {
        node.children.splice(node.children.indexOf(alert.paragraph), 1);
      }

      node.tagName = "aside";
      node.properties.className = ["makit-alert", `makit-alert-${alert.type}`];
      node.properties.role = "note";
      node.properties["aria-label"] = alert.type;
      node.children.unshift(titleNode(alert.type));
    });
  };
}
