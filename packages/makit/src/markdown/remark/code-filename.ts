import { visit } from "unist-util-visit";

interface MarkdownCodeNode {
  type: "code";
  meta?: string | null;
  data?: Record<string, unknown>;
}

interface CodeMetadata {
  filename?: string;
  lineNumbers: boolean;
}

function extractMetadata(meta: string | null | undefined): CodeMetadata {
  const value = meta?.trim();
  if (!value) return { lineNumbers: false };

  const lineNumbers = /(?:^|\s)lineNumbers(?:\s|$)/.test(value);

  const title = value.match(/(?:^|\s)title=(?:"([^"]+)"|'([^']+)'|([^\s]+))/);
  if (title) return { filename: title[1] ?? title[2] ?? title[3], lineNumbers };

  const quoted = value.match(/^(?:"([^"]+)"|'([^']+)')/);
  if (quoted) return { filename: quoted[1] ?? quoted[2], lineNumbers };

  const candidate = value.split(/\s+/, 1)[0];
  if (!candidate || candidate === "lineNumbers" || candidate.startsWith("{") || candidate.includes("=")) {
    return { lineNumbers };
  }
  return { filename: candidate, lineNumbers };
}

/** Carries a fenced code block's filename metadata through remark-rehype. */
export function remarkCodeFilename() {
  return (tree: unknown) => {
    visit(tree as never, "code", (rawNode) => {
      const node = rawNode as unknown as MarkdownCodeNode;
      const { filename, lineNumbers } = extractMetadata(node.meta);
      if (!filename && !lineNumbers) return;

      const data = (node.data ??= {});
      const hProperties = data.hProperties as Record<string, unknown> | undefined;
      data.hProperties = {
        ...hProperties,
        ...(filename ? { dataFilename: filename } : {}),
        ...(lineNumbers ? { dataLineNumbers: true } : {}),
      };
    });
  };
}
