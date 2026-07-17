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

function hasLineNumbers(codeNode: Element): boolean {
  const value = codeNode.properties.dataLineNumbers ?? codeNode.properties["data-line-numbers"];
  return value === true || value === "true" || value === "";
}

function isMarkdownLanguage(lang: string | undefined): boolean {
  return lang === "markdown" || lang === "md" || lang === "mdx";
}

type LineAnnotation = "highlighted" | "diff add" | "diff remove";

function extractLineAnnotations(code: string): { code: string; annotations: Array<LineAnnotation | undefined> } {
  const annotations: Array<LineAnnotation | undefined> = [];
  const cleaned = code.split("\n").map((line) => {
    const match = line.match(/\s*\/\/\s*\[!code\s+(highlight|\+\+|--)\]\s*$/);
    if (!match) {
      annotations.push(undefined);
      return line;
    }
    annotations.push(
      match[1] === "highlight" ? "highlighted" : match[1] === "++" ? "diff add" : "diff remove",
    );
    return line.slice(0, match.index).trimEnd();
  });
  return { code: cleaned.join("\n"), annotations };
}

function addLineAnnotations(pre: Element, annotations: Array<LineAnnotation | undefined>): void {
  let line = 0;
  const annotate = (node: Element): void => {
    const classes = getClasses(node);
    if (!classes.some((value) => typeof value === "string" && value.split(/\s+/).includes("line"))) {
      for (const child of node.children) {
        if (child.type === "element") annotate(child);
      }
      return;
    }
    const annotation = annotations[line++];
    if (annotation) {
      setClasses(node, [...classes, ...annotation.split(" ")]);
    }
  };
  annotate(pre);
}

function getClasses(node: Element): string[] {
  return [node.properties.className, node.properties.class]
    .flatMap((className) =>
      Array.isArray(className) ? className : typeof className === "string" ? [className] : [],
    )
    .filter((value): value is string => typeof value === "string")
    .flatMap((value) => value.split(/\s+/));
}

function setClasses(node: Element, classes: string[]): void {
  node.properties.className = [...new Set(classes)];
  delete node.properties.class;
}

function addClass(node: Element, classToAdd: string): void {
  const classes = getClasses(node);
  if (!classes.includes(classToAdd)) classes.push(classToAdd);
  setClasses(node, classes);
}

interface HighlightTarget {
  parent: Root | Element;
  index: number;
  code: string;
  lang: string | undefined;
  filename: string | undefined;
  lineNumbers: boolean;
  annotations: Array<LineAnnotation | undefined>;
}

/**
 * Replaces `<pre><code class="language-x">` blocks with Shiki-highlighted
 * output (spec §20). Targets are collected during a synchronous tree walk
 * first, then highlighted and swapped in afterwards — `visit` doesn't
 * support awaiting inside its callback.
 */
export function rehypeShikiHighlight(
  shikiConfig: ResolvedShikiConfig,
  options: { lineNumbers: boolean },
) {
  return async (tree: Root, file: VFile) => {
    const targets: HighlightTarget[] = [];

    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "pre" || index === undefined || !parent) return;
      const codeChild = node.children.find(
        (child): child is Element => child.type === "element" && child.tagName === "code",
      );
      if (!codeChild) return;
      const lang = extractLang(codeChild);
      const originalCode = hastToString(codeChild).replace(/\n$/, "");
      const annotated = isMarkdownLanguage(lang)
        ? { code: originalCode, annotations: [] }
        : extractLineAnnotations(originalCode);
      targets.push({
        parent: parent as Root | Element,
        index,
        code: annotated.code,
        lang,
        filename: extractFilename(codeChild),
        lineNumbers: options.lineNumbers || hasLineNumbers(codeChild),
        annotations: annotated.annotations,
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
        if (target.lineNumbers) addClass(newPre, "has-line-numbers");
        addLineAnnotations(newPre, target.annotations);
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
