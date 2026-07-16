import { existsSync } from "node:fs";
import { join, sep } from "node:path";
import type { NavigationGroup, NavigationItem } from "../types/config.js";
import type { GeneratedPage } from "../types/page.js";
import type { ResolvedConfig } from "../types/resolved-config.js";
import { groupPagesByPageId } from "./i18n.js";

export interface Diagnostic {
  code:
    | "missing-title"
    | "unknown-code-language"
    | "page-not-in-navigation"
    | "broken-link"
    | "missing-anchor"
    | "missing-site-url"
    | "missing-og-image"
    | "default-locale-only-page"
    | "translation-only-page"
    | "too-many-fallback-pages";
  message: string;
  sourcePath?: string;
}

const HREF_RE = /<a\s[^>]*href="([^"]*)"/g;
const IMG_SRC_RE = /<img\s[^>]*src="([^"]*)"/g;

function extractAttrValues(html: string, regex: RegExp): string[] {
  return [...html.matchAll(regex)].map((match) => match[1]!);
}

function isExternalUrl(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href);
}

/** Broken internal links, missing anchors, invalid external URL syntax, and drafts linked from production pages (spec §27.3). */
export function validateInternalLinks(pages: readonly GeneratedPage[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const routeMap = new Map<string, GeneratedPage>();
  for (const page of pages) routeMap.set(page.route, page);

  for (const page of pages) {
    for (const href of extractAttrValues(page.html, HREF_RE)) {
      if (!href) continue;

      if (href.startsWith("#")) {
        const anchorId = href.slice(1);
        if (anchorId && !page.headings.some((heading) => heading.id === anchorId)) {
          diagnostics.push({
            code: "missing-anchor",
            message: `Anchor "${href}" not found on the same page`,
            sourcePath: page.sourcePath,
          });
        }
        continue;
      }

      if (isExternalUrl(href)) {
        try {
          new URL(href);
        } catch {
          diagnostics.push({
            code: "broken-link",
            message: `Invalid external URL "${href}"`,
            sourcePath: page.sourcePath,
          });
        }
        continue;
      }

      const hashIndex = href.indexOf("#");
      const routePart = hashIndex === -1 ? href : href.slice(0, hashIndex);
      const anchorPart = hashIndex === -1 ? undefined : href.slice(hashIndex + 1);
      const targetPage = routeMap.get(routePart);

      if (!targetPage) {
        diagnostics.push({
          code: "broken-link",
          message: `Link to "${href}" does not match any known page`,
          sourcePath: page.sourcePath,
        });
        continue;
      }

      if (targetPage.draft && !page.draft) {
        diagnostics.push({
          code: "broken-link",
          message: `Links to draft page "${routePart}"`,
          sourcePath: page.sourcePath,
        });
      }

      if (anchorPart && !targetPage.headings.some((heading) => heading.id === anchorPart)) {
        diagnostics.push({
          code: "missing-anchor",
          message: `Anchor "#${anchorPart}" not found on "${routePart}"`,
          sourcePath: page.sourcePath,
        });
      }
    }
  }

  return diagnostics;
}

/** Local (root-relative) image references that don't exist under `publicDir` (spec §22, §27.3). */
export function validateImages(
  pages: readonly GeneratedPage[],
  config: ResolvedConfig,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const page of pages) {
    for (const src of extractAttrValues(page.html, IMG_SRC_RE)) {
      if (!src.startsWith("/") || src.startsWith("//") || isExternalUrl(src)) continue;

      const relativePath = src.slice(1).split("/").join(sep);
      const absolutePath = join(config.root, config.publicDir, relativePath);
      if (!existsSync(absolutePath)) {
        diagnostics.push({
          code: "broken-link",
          message: `Image "${src}" not found in "${config.publicDir}"`,
          sourcePath: page.sourcePath,
        });
      }
    }
  }

  return diagnostics;
}

/** Pages whose title fell all the way back to the filename or pageId (spec §14.2, §31.2). */
export function validateTitles(pages: readonly GeneratedPage[]): Diagnostic[] {
  return pages
    .filter((page) => page.titleSource === "filename" || page.titleSource === "pageId")
    .map((page) => ({
      code: "missing-title" as const,
      message: `No title set (front matter \`title\` or an H1) — falling back to "${page.title}"`,
      sourcePath: page.sourcePath,
    }));
}

/** Site-wide and per-page SEO gaps: missing `siteUrl`, missing OGP image (spec §24, §31.2). */
export function validateSeo(pages: readonly GeneratedPage[], config: ResolvedConfig): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  if (!config.siteUrl) {
    diagnostics.push({ code: "missing-site-url", message: "`siteUrl` is not configured" });
  }

  if (!config.seo.defaultImage) {
    for (const page of pages) {
      if (page.isFallback || page.metadata.noindex) continue;
      if (!page.metadata.image) {
        diagnostics.push({
          code: "missing-og-image",
          message: "No OGP image (front matter `image` or `seo.defaultImage`)",
          sourcePath: page.sourcePath,
        });
      }
    }
  }

  return diagnostics;
}

function flattenNavigationHrefs(groups: readonly NavigationGroup[]): Set<string> {
  const hrefs = new Set<string>();
  const visit = (items: readonly NavigationItem[]) => {
    for (const item of items) {
      if (item.href && !item.external) hrefs.add(item.href);
      if (item.items) visit(item.items);
    }
  };
  for (const group of groups) visit(group.items);
  return hrefs;
}

/** Non-hidden pages that don't appear anywhere in their locale's navigation (spec §31.2). */
export function validateNavigationCoverage(
  pages: readonly GeneratedPage[],
  navigationByLocale: Readonly<Record<string, NavigationGroup[]>>,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const [locale, groups] of Object.entries(navigationByLocale)) {
    const hrefs = flattenNavigationHrefs(groups);
    for (const page of pages) {
      if (page.locale !== locale || page.hidden || page.isFallback) continue;
      if (!hrefs.has(page.route)) {
        diagnostics.push({
          code: "page-not-in-navigation",
          message: `Page "${page.route}" is not reachable from the "${locale}" navigation`,
          sourcePath: page.sourcePath,
        });
      }
    }
  }

  return diagnostics;
}

/**
 * Translation coverage gaps: pages that exist in the default locale but not
 * every other locale, and pages that exist in a non-default locale but not
 * the default one (spec §31.2).
 */
export function validateTranslationCoverage(
  realPages: readonly GeneratedPage[],
  config: ResolvedConfig,
): Diagnostic[] {
  if (!config.i18n.enabled) return [];

  const diagnostics: Diagnostic[] = [];
  const defaultLocale = config.i18n.locales.find(
    (locale) => locale.locale === config.i18n.defaultLocale,
  );
  if (!defaultLocale) return [];

  const groups = groupPagesByPageId(realPages);
  for (const group of groups.values()) {
    const hasDefault = group.byLocale.has(defaultLocale.urlLocale);
    const localeCount = group.byLocale.size;

    if (hasDefault && localeCount < config.i18n.locales.length) {
      const sourcePage = group.byLocale.get(defaultLocale.urlLocale)!;
      diagnostics.push({
        code: "default-locale-only-page",
        message: `"${sourcePage.pageId}" exists in "${defaultLocale.urlLocale}" but is missing in ${config.i18n.locales.length - localeCount} other locale(s)`,
        sourcePath: sourcePage.sourcePath,
      });
    } else if (!hasDefault) {
      for (const page of group.byLocale.values()) {
        diagnostics.push({
          code: "translation-only-page",
          message: `"${page.pageId}" exists in "${page.locale}" but not in the default locale ("${defaultLocale.urlLocale}")`,
          sourcePath: page.sourcePath,
        });
      }
    }
  }

  return diagnostics;
}

/** Warns when a large share of a locale's pages are fallback-generated (spec §31.2). */
export function validateFallbackRatio(
  allPages: readonly GeneratedPage[],
  config: ResolvedConfig,
): Diagnostic[] {
  if (!config.i18n.enabled) return [];

  const diagnostics: Diagnostic[] = [];
  for (const locale of config.i18n.locales) {
    const localePages = allPages.filter((page) => page.locale === locale.urlLocale);
    if (localePages.length === 0) continue;
    const fallbackCount = localePages.filter((page) => page.isFallback).length;
    if (fallbackCount / localePages.length > 0.5) {
      diagnostics.push({
        code: "too-many-fallback-pages",
        message: `${fallbackCount}/${localePages.length} pages in "${locale.urlLocale}" are untranslated fallbacks`,
      });
    }
  }
  return diagnostics;
}

export interface ValidatePagesOptions {
  navigationByLocale?: Readonly<Record<string, NavigationGroup[]>>;
}

/** Runs every document-level check (spec §9.7 `makit check` targets, §31.2 warnings). */
export function validatePages(
  allPages: readonly GeneratedPage[],
  config: ResolvedConfig,
  options: ValidatePagesOptions = {},
): Diagnostic[] {
  const realPages = allPages.filter((page) => !page.isFallback);

  const diagnostics: Diagnostic[] = [
    ...validateInternalLinks(allPages),
    ...validateImages(allPages, config),
    ...validateTitles(realPages),
    ...validateSeo(allPages, config),
    ...validateTranslationCoverage(realPages, config),
    ...validateFallbackRatio(allPages, config),
  ];

  if (options.navigationByLocale) {
    diagnostics.push(...validateNavigationCoverage(allPages, options.navigationByLocale));
  }

  return diagnostics;
}

/**
 * Diagnostics that should be treated as build-stopping errors under
 * `validation.strict` (promotes everything) or `validation.failOn`
 * (promotes only the listed codes) — spec §31.3.
 */
export function selectPromotedDiagnostics(
  diagnostics: readonly Diagnostic[],
  validation: ResolvedConfig["validation"],
): Diagnostic[] {
  if (validation.strict) return [...diagnostics];
  if (validation.failOn.length === 0) return [];
  const failOnCodes = new Set<string>(validation.failOn);
  return diagnostics.filter((diagnostic) => failOnCodes.has(diagnostic.code));
}
