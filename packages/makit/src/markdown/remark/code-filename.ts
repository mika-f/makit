import { visit } from "unist-util-visit";

interface MarkdownCodeNode {
  type: "code";
  meta?: string | null;
  data?: Record<string, unknown>;
}

function extractFilename(meta: string | null | undefined): string | undefined {
  const value = meta?.trim();
  if (!value) return undefined;

  const title = value.match(/(?:^|\s)title=(?:"([^"]+)"|'([^']+)'|([^\s]+))/);
  if (title) return title[1] ?? title[2] ?? title[3];

  const quoted = value.match(/^(?:"([^"]+)"|'([^']+)')/);
  if (quoted) return quoted[1] ?? quoted[2];

  const candidate = value.split(/\s+/, 1)[0];
  if (!candidate || candidate.startsWith("{") || candidate.includes("=")) return undefined;
  return candidate;
}

/** Carries a fenced code block's filename metadata through remark-rehype. */
export function remarkCodeFilename() {
  return (tree: unknown) => {
    visit(tree as never, "code", (rawNode) => {
      const node = rawNode as unknown as MarkdownCodeNode;
      const filename = extractFilename(node.meta);
      if (!filename) return;

      const data = (node.data ??= {});
      const hProperties = data.hProperties as Record<string, unknown> | undefined;
      data.hProperties = { ...hProperties, dataFilename: filename };
    });
  };
}
