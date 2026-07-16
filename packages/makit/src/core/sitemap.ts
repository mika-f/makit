import type { GeneratedPage } from "../types/page.js";
import type { ResolvedConfig } from "../types/resolved-config.js";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Generates `sitemap.xml` (spec §25). Returns `undefined` when disabled or `siteUrl` isn't configured. */
export function generateSitemapXml(
  pages: readonly GeneratedPage[],
  config: ResolvedConfig,
): string | undefined {
  if (!config.sitemap.enabled || !config.siteUrl) return undefined;

  const siteUrl = config.siteUrl.replace(/\/$/, "");

  const eligible = pages.filter((page) => {
    if (page.draft) return false;
    if (page.metadata.noindex) return false;
    if (page.isFallback && !config.sitemap.includeFallbackPages) return false;
    return true;
  });

  const urlEntries = eligible.map((page) => {
    const loc = escapeXml(`${siteUrl}${page.route}`);
    const alternateLinks = page.metadata.alternates
      .map(
        (alternate) =>
          `    <xhtml:link rel="alternate" hreflang="${escapeXml(alternate.hreflang)}" href="${escapeXml(`${siteUrl}${alternate.href}`)}" />`,
      )
      .join("\n");
    return `  <url>\n    <loc>${loc}</loc>\n${alternateLinks ? `${alternateLinks}\n` : ""}  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urlEntries.join("\n")}\n</urlset>\n`;
}
