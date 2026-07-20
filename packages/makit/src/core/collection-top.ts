import type { GeneratedPage } from "../types/page.js";
import type { ResolvedConfig } from "../types/resolved-config.js";
import type { ResolvedCollection } from "./collections.js";
import { escapeHtml } from "./text.js";
import { buildRoute } from "./routes.js";

/**
 * Renders a minimal landing page body for a synthesized collection top
 * (spec §34): the collection description followed by a flat, order-sorted
 * list of its pages. Real navigation (sections/groups) isn't resolved yet
 * at this point in the pipeline, so this intentionally stays simple rather
 * than trying to approximate the eventual nav tree.
 */
function renderCollectionTopHtml(
  description: string | undefined,
  pages: readonly GeneratedPage[],
): string {
  const parts: string[] = [];
  if (description) {
    parts.push(`<p>${escapeHtml(description)}</p>`);
  }
  if (pages.length > 0) {
    const items = pages
      .map((page) => `<li><a href="${escapeHtml(page.route)}">${escapeHtml(page.title)}</a></li>`)
      .join("");
    parts.push(`<ul>${items}</ul>`);
  }
  return parts.join("\n");
}

/**
 * Synthesizes a top page for every (locale, collection) that still has no
 * root page after real pages *and* i18n fallback pages are accounted for
 * (spec §34) — pass `[...productionPages, ...fallbackPages]`. Scoped to
 * non-implicit collections — implicit-collection sites keep the v0.1
 * behavior of simply having no root route when there's no `index.md`
 * (spec §48.1).
 */
export function synthesizeCollectionTopPages(
  pages: readonly GeneratedPage[],
  config: ResolvedConfig,
  collections: readonly ResolvedCollection[],
): GeneratedPage[] {
  const synthesized: GeneratedPage[] = [];

  for (const collection of collections) {
    if (collection.implicit) continue;

    for (const locale of config.i18n.locales) {
      const collectionLocale = collection.locales[locale.urlLocale];
      if (!collectionLocale) continue;

      const localePages = pages.filter(
        (page) => page.locale === locale.urlLocale && page.collectionId === collection.id,
      );
      // Compares against the URL, not `pathSegments` (which keeps route-group
      // directories) — a page nested inside a route group can still resolve
      // to the collection root (ROUTE-GROUPS §4).
      const hasRealTop = localePages.some(
        (page) => page.segments.length === collection.pathSegments.length,
      );
      if (hasRealTop) continue;

      const route = buildRoute([], {
        basePath: config.basePath,
        localePrefix: config.i18n.enabled ? locale.urlLocale : undefined,
        collectionSegments: collection.pathSegments,
        trailingSlash: config.build.trailingSlash,
      });

      const listedPages = [...localePages]
        .filter((page) => !page.hidden && !page.draft)
        .sort(
          (a, b) =>
            (a.order ?? a.filenameOrder ?? Number.POSITIVE_INFINITY) -
              (b.order ?? b.filenameOrder ?? Number.POSITIVE_INFINITY) ||
            a.title.localeCompare(b.title, locale.lang),
        );

      synthesized.push({
        pageId: "index",
        collectionId: collection.id,
        route,
        segments: [...collection.pathSegments],
        pathSegments: [],
        locale: locale.urlLocale,
        contentLocale: locale.urlLocale,
        sourcePath: `${collectionLocale.dir} (synthesized collection top, spec §34)`,
        isFallback: false,
        title: collectionLocale.title,
        description: collectionLocale.description,
        html: renderCollectionTopHtml(collectionLocale.description, listedPages),
        headings: [],
        draft: false,
        hidden: false,
        titleSource: "metadata",
        pageIdSource: "auto",
        sidebar: true,
        tableOfContents: false,
        hierarchy: [],
        breadcrumbs: [],
        metadata: {
          noindex: false,
          nofollow: false,
          alternates: [],
        },
      });
    }
  }

  return synthesized;
}
