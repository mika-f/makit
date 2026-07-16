import type { GeneratedPage } from "../types/page.js";

export interface SearchEntry {
  pageId: string;
  title: string;
  route: string;
  locale: string;
  headings: string[];
  content: string;
}

const TAG_RE = /<[^>]+>/g;
const ENTITY_RE = /&[a-z0-9#]+;/gi;
const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function htmlToPlainText(html: string): string {
  const withoutTags = html.replace(TAG_RE, " ");
  const decoded = withoutTags.replace(ENTITY_RE, (entity) => HTML_ENTITIES[entity] ?? entity);
  return decoded.replace(/\s+/g, " ").trim();
}

/**
 * Builds search index data per locale (spec §28). No search UI ships in the
 * MVP — this is just the data a future search implementation would consume.
 * Fallback, hidden, and draft pages are excluded: they either duplicate
 * another locale's content or shouldn't be discoverable at all.
 */
export function buildSearchIndex(pages: readonly GeneratedPage[]): Record<string, SearchEntry[]> {
  const byLocale: Record<string, SearchEntry[]> = {};

  for (const page of pages) {
    if (page.isFallback || page.hidden || page.draft) continue;

    const entry: SearchEntry = {
      pageId: page.pageId,
      title: page.title,
      route: page.route,
      locale: page.locale,
      headings: page.headings.map((heading) => heading.text),
      content: htmlToPlainText(page.html),
    };

    const list = byLocale[page.locale] ?? [];
    list.push(entry);
    byLocale[page.locale] = list;
  }

  return byLocale;
}
