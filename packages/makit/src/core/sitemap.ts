import type { GeneratedAlternate, GeneratedPage } from "../types/page.js";
import type { ResolvedConfig } from "../types/resolved-config.js";
import type { GeneratedStaticPage } from "../types/static-page.js";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlEntry(
  siteUrl: string,
  route: string,
  alternates: readonly GeneratedAlternate[],
): string {
  const loc = escapeXml(`${siteUrl}${route}`);
  const alternateLinks = alternates
    .map(
      (alternate) =>
        `    <xhtml:link rel="alternate" hreflang="${escapeXml(alternate.hreflang)}" href="${escapeXml(`${siteUrl}${alternate.href}`)}" />`,
    )
    .join("\n");
  return `  <url>\n    <loc>${loc}</loc>\n${alternateLinks ? `${alternateLinks}\n` : ""}  </url>`;
}

/** Generates `sitemap.xml` (spec §25, STATIC-PAGES §12.5). Returns `undefined` when disabled or `siteUrl` isn't configured. */
export function generateSitemapXml(
  pages: readonly GeneratedPage[],
  config: ResolvedConfig,
  staticPages: readonly GeneratedStaticPage[] = [],
): string | undefined {
  if (!config.sitemap.enabled || !config.siteUrl) return undefined;

  const siteUrl = config.siteUrl.replace(/\/$/, "");

  const eligible = pages.filter((page) => {
    if (page.draft) return false;
    if (page.metadata.noindex) return false;
    if (page.isFallback && !config.sitemap.includeFallbackPages) return false;
    return true;
  });

  const urlEntries = [
    ...eligible.map((page) => urlEntry(siteUrl, page.route, page.metadata.alternates)),
    ...staticPages
      .filter((page) => !page.draft && !page.metadata.noindex)
      .map((page) => urlEntry(siteUrl, page.route, page.metadata.alternates)),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urlEntries.join("\n")}\n</urlset>\n`;
}
