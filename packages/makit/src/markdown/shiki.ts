import type { Root as HastRoot } from "hast";
import { bundledLanguages, getSingletonHighlighter } from "shiki";
import { MakitError } from "../core/errors.js";
import type { ResolvedShikiConfig } from "../types/resolved-config.js";

export interface ShikiHighlightResult {
  hast: HastRoot;
  resolvedLang: string;
  /** Set when an unknown language was downgraded to plain text under `unknownLanguage: "warning"`. */
  warning?: string;
}

function isKnownLanguage(lang: string): boolean {
  return lang === "text" || lang === "plaintext" || lang === "txt" || lang in bundledLanguages;
}

/**
 * Highlights one fenced code block with Shiki (spec §20). The singleton
 * highlighter accumulates themes/languages across calls, so it is safe to
 * call this once per code block without pre-loading everything up front.
 */
export async function highlightCode(
  code: string,
  requestedLang: string | undefined,
  shikiConfig: ResolvedShikiConfig,
): Promise<ShikiHighlightResult> {
  const { light, dark } = shikiConfig.themes;
  const highlighter = await getSingletonHighlighter({ themes: [light, dark], langs: [] });

  const lang = requestedLang?.toLowerCase();
  let resolvedLang = lang ?? "text";
  let warning: string | undefined;

  if (lang && !isKnownLanguage(lang)) {
    switch (shikiConfig.unknownLanguage) {
      case "error":
        throw new MakitError("markdown-processing-failed", `Unknown code language "${lang}"`);
      case "plain-text":
        resolvedLang = "text";
        break;
      case "warning":
      default:
        resolvedLang = "text";
        warning = `Unknown code language "${lang}", rendering as plain text.`;
        break;
    }
  }

  if (resolvedLang !== "text" && !highlighter.getLoadedLanguages().includes(resolvedLang)) {
    await highlighter.loadLanguage(resolvedLang as keyof typeof bundledLanguages);
  }

  const hast = highlighter.codeToHast(code, {
    lang: resolvedLang,
    themes: { light, dark },
  });

  return { hast, resolvedLang, warning };
}
