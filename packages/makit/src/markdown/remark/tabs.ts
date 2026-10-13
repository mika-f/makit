import type { Element, ElementContent, Properties } from "hast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { VFile } from "vfile";

interface MarkdownNode {
  type: string;
  name?: string;
  value?: string;
  attributes?: Record<string, string | null | undefined>;
  children?: MarkdownNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
  data?: Record<string, unknown>;
}

function text(node: MarkdownNode): string {
  return node.value ?? node.children?.map(text).join("") ?? "";
}

function label(node: MarkdownNode): string {
  const first = node.children?.[0];
  return first?.data?.directiveLabel ? text(first).trim() : "";
}

function body(node: MarkdownNode): MarkdownNode[] {
  const children = node.children ?? [];
  return children[0]?.data?.directiveLabel ? children.slice(1) : children;
}

function element(tagName: string, properties: Properties, children: ElementContent[]): Element {
  return { type: "element", tagName, properties, children };
}

/** Converts Markdown tab containers to HTML without enabling raw HTML or MDX. */
export function remarkTabs({ gfm = true }: { gfm?: boolean } = {}) {
  // Unhandled directives retain their ordinary Markdown meaning. In particular,
  // enabling tabs must not silently consume text like `:example[link]`.
  const fallback = unified().use(remarkParse);
  if (gfm) fallback.use(remarkGfm);

  return (rawTree: unknown, file: VFile) => {
    const tree = rawTree as MarkdownNode;
    let groupIndex = 0;
    const warn = (message: string) => {
      const warnings = (file.data.warnings ??= []) as string[];
      warnings.push(`Tabs: ${message}`);
    };

    function transform(parent: MarkdownNode): void {
      if (!parent.children) return;
      parent.children = parent.children.flatMap((node): MarkdownNode[] => {
        if (node.type === "containerDirective" && node.name === "tabs") {
          const tabs = body(node);
          if (
            !tabs.length ||
            tabs.some(
              (tab) => tab.type !== "containerDirective" || tab.name !== "tab" || !label(tab),
            )
          ) {
            warn(
              "a tabs container must contain only tab containers with non-empty labels (:::tab[Label]).",
            );
          } else {
            const labels = tabs.map(label);
            const requested = node.attributes?.default;
            let selected = requested ? labels.indexOf(requested) : 0;
            if (selected < 0) {
              warn(`default tab "${requested}" does not match any label; using the first tab.`);
              selected = 0;
            }
            const id = `makit-tabs-${++groupIndex}`;
            const buttons = labels.map((value, index) =>
              element(
                "button",
                {
                  type: "button",
                  role: "tab",
                  id: `${id}-tab-${index + 1}`,
                  ariaControls: [`${id}-panel-${index + 1}`],
                  ariaSelected: index === selected ? "true" : "false",
                  tabIndex: index === selected ? 0 : -1,
                  className: ["makit-tab"],
                },
                [{ type: "text", value }],
              ),
            );
            const tablist: MarkdownNode = {
              type: "makitTabList",
              data: {
                hName: "div",
                hProperties: {
                  role: "tablist",
                  ariaLabel: label(node) || "Tabs",
                  className: ["makit-tab-list"],
                },
                hChildren: buttons,
              },
            };
            tabs.forEach((tab, index) => {
              const value = labels[index]!;
              tab.type = "makitTabPanel";
              tab.data = {
                hName: "div",
                hProperties: {
                  role: "tabpanel",
                  id: `${id}-panel-${index + 1}`,
                  ariaLabelledBy: `${id}-tab-${index + 1}`,
                  tabIndex: 0,
                  className: ["makit-tab-panel"],
                },
              };
              tab.children = [
                {
                  type: "paragraph",
                  data: { hProperties: { className: ["makit-tab-fallback-label"] } },
                  children: [{ type: "text", value }],
                },
                ...body(tab),
              ];
              transform(tab);
            });
            node.type = "makitTabs";
            node.data = {
              hName: "div",
              hProperties: {
                className: ["makit-tabs"],
                dataMakitTabs: "",
              },
            };
            node.children = [tablist, ...tabs];
            return [node];
          }
        } else if (node.type === "containerDirective" && node.name === "tab") {
          warn("a tab container must be a direct child of a tabs container.");
        }

        if (node.type.endsWith("Directive") && !node.data?.hName && !node.data?.hChildren) {
          const start = node.position?.start.offset;
          const end = node.position?.end.offset;
          if (start !== undefined && end !== undefined) {
            const original = fallback.parse(String(file).slice(start, end)) as MarkdownNode;
            return node.type === "textDirective"
              ? (original.children?.[0]?.children ?? [])
              : (original.children ?? []);
          }
        }
        transform(node);
        return [node];
      });
    }

    transform(tree);
  };
}
