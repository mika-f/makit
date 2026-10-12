import type { Element, Root, RootContent } from "hast";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";

export interface ProcessedStaticPageHtml {
  html: string;
  /** Source contained `<!doctype>`, `<html>`, `<head>` or `<body>` (STATIC-PAGES §8.1). */
  isDocument: boolean;
}

const DOCUMENT_RE = /<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i;

const URL_ATTRIBUTES = ["href", "src"] as const;

/** `/pricing/` yes; `//cdn.example.com/`, `./a/`, `https://`, `#top`, `mailto:` no. */
function isRootRelative(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

function findBody(root: Root): Element | undefined {
  let body: Element | undefined;
  visit(root, "element", (node: Element) => {
    if (body || node.tagName !== "body") return;
    body = node;
  });
  return body;
}

/**
 * Prepares an HTML Fragment for embedding (STATIC-PAGES §8.2). The only
 * rewrite is prefixing root-relative `href`/`src` with `basePath`; a full
 * document is reduced to its `<body>` content.
 */
export function processStaticPageHtml(source: string, basePath: string): ProcessedStaticPageHtml {
  const isDocument = DOCUMENT_RE.test(source);

  const processor = unified()
    .use(rehypeParse, { fragment: !isDocument })
    .use(() => (tree: Root) => {
      if (isDocument) {
        const body = findBody(tree);
        tree.children = (body?.children ?? []) as RootContent[];
      }
      if (!basePath) return;
      visit(tree, "element", (node: Element) => {
        for (const attribute of URL_ATTRIBUTES) {
          const value = node.properties[attribute];
          if (typeof value === "string" && isRootRelative(value)) {
            node.properties[attribute] = `${basePath}${value}`;
          }
        }
      });
    })
    .use(rehypeStringify);

  return { html: String(processor.processSync(source)), isDocument };
}
