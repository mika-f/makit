import type { VFile } from "vfile";
import { directiveBody, directiveLabel, type MarkdownNode } from "./directive-utils.js";

function enabled(node: MarkdownNode, attribute: string): boolean {
  return (
    Object.hasOwn(node.attributes ?? {}, attribute) && node.attributes?.[attribute] !== "false"
  );
}

/** Renders toggles and accordions as native details/summary controls. */
export function remarkDisclosures() {
  return (rawTree: unknown, file: VFile) => {
    let groupIndex = 0;
    const warn = (message: string) => {
      const warnings = (file.data.warnings ??= []) as string[];
      warnings.push(`Disclosures: ${message}`);
    };

    function toggle(node: MarkdownNode, name?: string, open = enabled(node, "open")): void {
      const label = directiveLabel(node);
      const children = directiveBody(node);
      node.type = "makitToggle";
      node.data = {
        hName: "details",
        hProperties: {
          className: ["makit-toggle"],
          dataMakitToggle: "",
          open,
          ...(name ? { name } : {}),
        },
      };
      node.children = [
        {
          type: "makitToggleSummary",
          data: {
            hName: "summary",
            hProperties: { className: ["makit-toggle-summary"] },
            hChildren: [{ type: "text", value: label }],
          },
        },
        {
          type: "makitToggleBody",
          data: { hName: "div", hProperties: { className: ["makit-toggle-body"] } },
          children,
        },
      ];
      transform(node);
    }

    function transform(parent: MarkdownNode): void {
      for (const node of parent.children ?? []) {
        if (node.type === "containerDirective" && node.name === "accordion") {
          const items = directiveBody(node);
          if (
            !items.length ||
            items.some(
              (item) =>
                item.type !== "containerDirective" ||
                item.name !== "toggle" ||
                !directiveLabel(item),
            )
          ) {
            warn(
              "an accordion must contain only toggle containers with non-empty labels (:::toggle[Label]).",
            );
            // Leave invalid containers intact for the ordinary Markdown fallback.
            continue;
          }
          const multiple = enabled(node, "multiple");
          const name = multiple ? undefined : `makit-accordion-${++groupIndex}`;
          let opened = false;
          for (const item of items) {
            let open = enabled(item, "open");
            if (!multiple && open && opened) {
              warn(
                "an exclusive accordion can have only one initially open toggle; keeping the first open toggle.",
              );
              open = false;
            }
            opened ||= open;
            toggle(item, name, open);
          }
          node.type = "makitAccordion";
          node.data = {
            hName: "div",
            hProperties: {
              className: ["makit-accordion"],
              role: "group",
              ariaLabel: directiveLabel(node) || "Accordion",
            },
          };
          node.children = items;
        } else if (node.type === "containerDirective" && node.name === "toggle") {
          if (!directiveLabel(node)) {
            warn("a toggle must have a non-empty label (:::toggle[Label]).");
            continue;
          }
          toggle(node);
        } else {
          transform(node);
        }
      }
    }

    transform(rawTree as MarkdownNode);
  };
}
