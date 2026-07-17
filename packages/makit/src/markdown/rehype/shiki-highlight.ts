import { toString as hastToString } from "hast-util-to-string";
import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";
import type { ResolvedShikiConfig } from "../../types/resolved-config.js";
import { highlightCode } from "../shiki.js";

function extractLang(codeNode: Element): string | undefined {
  const className = codeNode.properties.className;
  const classes = Array.isArray(className)
    ? className
    : typeof className === "string"
      ? [className]
      : [];
  for (const cls of classes) {
    if (typeof cls === "string" && cls.startsWith("language-")) {
      return cls.slice("language-".length);
    }
  }
  return undefined;
}

function extractFilename(codeNode: Element): string | undefined {
  const value = codeNode.properties.dataFilename ?? codeNode.properties["data-filename"];
  return typeof value === "string" ? value : undefined;
}

interface HighlightTarget {
  parent: Root | Element;
  index: number;
  code: string;
  lang: string | undefined;
  filename: string | undefined;
}

/**
 * Replaces `<pre><code class="language-x">` blocks with Shiki-highlighted
 * output (spec §20). Targets are collected during a synchronous tree walk
 * first, then highlighted and swapped in afterwards — `visit` doesn't
 * support awaiting inside its callback.
 */
export function rehypeShikiHighlight(shikiConfig: ResolvedShikiConfig) {
  return async (tree: Root, file: VFile) => {
    const targets: HighlightTarget[] = [];

    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "pre" || index === undefined || !parent) return;
      const codeChild = node.children.find(
        (child): child is Element => child.type === "element" && child.tagName === "code",
      );
      if (!codeChild) return;
      targets.push({
        parent: parent as Root | Element,
        index,
        code: hastToString(codeChild).replace(/\n$/, ""),
        lang: extractLang(codeChild),
        filename: extractFilename(codeChild),
      });
    });

    for (const target of targets) {
      const { hast, resolvedLang, warning } = await highlightCode(
        target.code,
        target.lang,
        shikiConfig,
      );
      const newPre = hast.children[0];
      if (newPre?.type === "element") {
        newPre.properties["data-language"] = resolvedLang;
        newPre.properties["data-label"] = target.filename ?? resolvedLang;
        if (target.filename) newPre.properties["data-filename"] = target.filename;
        target.parent.children[target.index] = newPre;
      }
      if (warning) {
        const warnings = (file.data.warnings as string[] | undefined) ?? [];
        warnings.push(warning);
        file.data.warnings = warnings;
      }
    }
  };
}
