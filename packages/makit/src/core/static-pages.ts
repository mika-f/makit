import { readFile } from "node:fs/promises";
import type { Jiti } from "jiti";
import {
  createMetadataJiti,
  loadMetadataFile,
  metadataLoadDiagnostics,
} from "../metadata/loader.js";
import type { StaticPageMetadata } from "../metadata/types.js";
import type { GeneratedAlternate, GeneratedPage } from "../types/page.js";
import type { ResolvedConfig } from "../types/resolved-config.js";
import type { GeneratedStaticPage } from "../types/static-page.js";
import type { MetadataCache } from "./cache.js";
import { MakitError } from "./errors.js";
import { localizeValue } from "./localize.js";
import { processStaticPageHtml } from "./static-page-html.js";
import {
  resolveStaticPageLocales,
  scanStaticPageSources,
  type LocalizedStaticPageSource,
  type StaticPageSource,
} from "./static-page-sources.js";
import type { Diagnostic } from "./validation.js";

export interface BuildStaticPagesOptions {
  jiti?: Jiti;
  metadataCache?: MetadataCache;
  /** `makit dev` keeps drafts (STATIC-PAGES §15); `build`/`check` pass false. */
  includeDrafts: boolean;
}

export interface BuildStaticPagesResult {
  staticPages: GeneratedStaticPage[];
  diagnostics: Diagnostic[];
  /** `.meta.ts` files and their local dependencies, for the dev metadata watcher. */
  watchPaths: string[];
}

interface LoadedStaticPageMetadata {
  value: StaticPageMetadata;
  dependencies: string[];
}

/** Title tier 2 (STATIC-PAGES §9.4): the last segment, `index`'s directory, or the site title at the root. */
function fallbackTitle(id: string, config: ResolvedConfig): string {
  const segments = id.split("/");
  if (segments[segments.length - 1] === "index") segments.pop();
  return segments[segments.length - 1] ?? config.title;
}

async function buildOne(
  entry: LocalizedStaticPageSource,
  metadata: StaticPageMetadata,
  config: ResolvedConfig,
  diagnostics: Diagnostic[],
): Promise<GeneratedStaticPage> {
  const { source, locale } = entry;

  const title = localizeValue(metadata.title, locale);
  if (title === undefined) {
    diagnostics.push({
      code: "static-page-missing-title",
      message: `Static page "${source.id}" has no title; add one in ${source.id}.meta.ts (STATIC-PAGES §9.4).`,
      sourcePath: source.absolutePath,
    });
  }

  let html: string | undefined;
  if (source.kind === "html") {
    const processed = processStaticPageHtml(
      await readFile(source.absolutePath, "utf-8"),
      config.basePath,
    );
    if (processed.isDocument) {
      diagnostics.push({
        code: "static-page-html-document",
        message:
          "HTML static pages are fragments; only the <body> content of this document is used (STATIC-PAGES §8.1).",
        sourcePath: source.absolutePath,
      });
    }
    html = processed.html;
  }

  return {
    id: source.id,
    route: entry.route,
    segments: entry.segments,
    locale: locale.urlLocale,
    sourcePath: source.absolutePath,
    metadataPath: source.metadataPath,
    kind: source.kind,
    componentKey: source.kind === "component" ? source.componentKey : undefined,
    html,
    title: title ?? fallbackTitle(source.id, config),
    description: localizeValue(metadata.description, locale),
    layout: metadata.layout ?? "default",
    search: metadata.search ?? false,
    draft: metadata.draft ?? false,
    metadata: {
      canonical: metadata.canonical,
      noindex: metadata.noindex ?? false,
      nofollow: metadata.nofollow ?? false,
      image: metadata.image,
      alternates: [],
    },
  };
}

/**
 * hreflang alternates between the locales of one Static Page ID, in the
 * same shape `populateAlternates` gives Markdown pages (spec §24.5).
 */
function withAlternates(
  pages: readonly GeneratedStaticPage[],
  config: ResolvedConfig,
): GeneratedStaticPage[] {
  if (!config.i18n.enabled) return [...pages];

  const byId = new Map<string, GeneratedStaticPage[]>();
  for (const page of pages) {
    const list = byId.get(page.id) ?? [];
    list.push(page);
    byId.set(page.id, list);
  }

  return pages.map((page) => {
    const group = byId.get(page.id)!;
    if (group.length < 2) return page;

    const alternates: GeneratedAlternate[] = [];
    for (const other of group) {
      if (other.locale === page.locale) continue;
      const localeConfig = config.i18n.locales.find((locale) => locale.urlLocale === other.locale);
      if (!localeConfig) continue;
      alternates.push({
        urlLocale: other.locale,
        hreflang: localeConfig.locale,
        href: other.route,
      });
    }
    const defaultLocale = config.i18n.locales.find(
      (locale) => locale.locale === config.i18n.defaultLocale,
    );
    const defaultPage = group.find((other) => other.locale === defaultLocale?.urlLocale);
    if (defaultPage) {
      alternates.push({ urlLocale: "x-default", hreflang: "x-default", href: defaultPage.route });
    }

    return { ...page, metadata: { ...page.metadata, alternates } };
  });
}

/**
 * Builds every static page for every locale (STATIC-PAGES §6, §9, §12.2).
 * Each Static Page ID's `.meta.ts` is evaluated once and shared by all of
 * its locales.
 */
export async function buildStaticPages(
  config: ResolvedConfig,
  options: BuildStaticPagesOptions,
): Promise<BuildStaticPagesResult> {
  const { sources, diagnostics } = await scanStaticPageSources(config);
  if (sources.length === 0) return { staticPages: [], diagnostics, watchPaths: [] };

  const jiti = options.jiti ?? createMetadataJiti();
  const metadataById = new Map<string, LoadedStaticPageMetadata>();
  const loadMetadata = async (source: StaticPageSource): Promise<StaticPageMetadata> => {
    if (!source.metadataPath) return {};
    const cached = metadataById.get(source.id);
    if (cached) return cached.value;
    const loaded = await loadMetadataFile<StaticPageMetadata>(source.metadataPath, "static-page", {
      projectRoot: config.root,
      jiti,
      cache: options.metadataCache,
    });
    diagnostics.push(...metadataLoadDiagnostics(loaded));
    metadataById.set(source.id, { value: loaded.value, dependencies: loaded.dependencies });
    return loaded.value;
  };

  const built: GeneratedStaticPage[] = [];
  for (const entry of resolveStaticPageLocales(sources, config)) {
    const metadata = await loadMetadata(entry.source);
    // Drafts are dropped before alternates are computed, so a production page
    // never advertises a translation that was not built (STATIC-PAGES §15).
    if (metadata.draft && !options.includeDrafts) continue;
    built.push(await buildOne(entry, metadata, config, diagnostics));
  }

  const watchPaths = new Set<string>();
  for (const source of sources) {
    if (source.metadataPath) watchPaths.add(source.metadataPath);
  }
  for (const loaded of metadataById.values()) {
    for (const dependency of loaded.dependencies) watchPaths.add(dependency);
  }

  return { staticPages: withAlternates(built, config), diagnostics, watchPaths: [...watchPaths] };
}

/**
 * Rejects static pages whose URL is already taken — by a Markdown page, a
 * synthesized collection top, or another static page — and a static
 * `index` next to an explicit `home.layout` (STATIC-PAGES §14, §16).
 */
export function assertStaticPageRoutes(
  staticPages: readonly GeneratedStaticPage[],
  pages: readonly GeneratedPage[],
  config: ResolvedConfig,
): void {
  const claimed = new Map<string, string>();
  for (const page of pages) {
    claimed.set(`${page.locale}:${page.segments.join("/")}`, page.sourcePath);
  }

  for (const page of staticPages) {
    if (page.segments.length === 0 && config.home.layout !== undefined) {
      throw new MakitError(
        "static-page-home-conflict",
        `${page.sourcePath} occupies the site root, but home.layout is "${config.home.layout}". Remove one of them (STATIC-PAGES §14).`,
      );
    }

    const key = `${page.locale}:${page.segments.join("/")}`;
    const owner = claimed.get(key);
    if (owner) {
      throw new MakitError(
        "static-page-route-conflict",
        `${page.sourcePath} and ${owner} both resolve to ${page.route} in locale "${page.locale}" (STATIC-PAGES §16).`,
      );
    }
    claimed.set(key, page.sourcePath);
  }
}
