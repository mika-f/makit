import type { Jiti } from "jiti";
import type { GlobalNavigationGroup, GlobalNavigationItem } from "../types/config.js";
import type { GeneratedPage } from "../types/page.js";
import type { ResolvedConfig, ResolvedLocaleConfig } from "../types/resolved-config.js";
import type { MetadataCache } from "./cache.js";
import type { ResolvedCollection } from "./collections.js";
import { MakitError } from "./errors.js";
import type { ResolvedNavNode } from "./nav-nodes.js";
import { resolveCollectionNavigation } from "./nav-resolve.js";
import { buildRoute } from "./routes.js";
import type { Diagnostic } from "./validation.js";

export interface GenerateNavigationResult {
  navigation: ResolvedNavNode[];
  warnings: string[];
  diagnostics: Diagnostic[];
  /** navigation.makit.ts / category.makit.ts files involved, for watching. */
  metadataPaths: string[];
}

/** Builds the navigation tree for one (locale, collection) pair (spec §25, §27). */
export async function generateNavigation(
  pages: readonly GeneratedPage[],
  locale: ResolvedLocaleConfig,
  config: ResolvedConfig,
  collection: ResolvedCollection,
  collections: readonly ResolvedCollection[],
  jiti: Jiti,
  metadataCache?: MetadataCache,
): Promise<GenerateNavigationResult> {
  const result = await resolveCollectionNavigation({
    pages,
    locale,
    config,
    collection,
    collections,
    jiti,
    metadataCache,
  });
  return {
    navigation: result.items,
    warnings: result.warnings,
    diagnostics: result.diagnostics,
    metadataPaths: result.metadataPaths,
  };
}

/** A global navigation item with `collection` references resolved to concrete hrefs. */
export interface ResolvedGlobalNavigationItem {
  title: string;
  href?: string;
  /** The referenced collection's id, kept for active-state highlighting. */
  collection?: string;
  external?: boolean;
  items?: ResolvedGlobalNavigationItem[];
}

export interface ResolvedGlobalNavigationGroup {
  title?: string;
  items: ResolvedGlobalNavigationItem[];
}

/**
 * Resolves `navigation.global` for one locale (spec §26): `collection`
 * references become the collection's top-page route. Referencing an unknown
 * collection is a build error (spec §45).
 */
export function resolveGlobalNavigation(
  groups: readonly GlobalNavigationGroup[],
  locale: ResolvedLocaleConfig,
  config: ResolvedConfig,
  collections: readonly ResolvedCollection[],
): ResolvedGlobalNavigationGroup[] {
  const byId = new Map(collections.map((collection) => [collection.id, collection]));
  const localePrefix = config.i18n.enabled ? locale.urlLocale : undefined;

  const resolveItem = (item: GlobalNavigationItem): ResolvedGlobalNavigationItem => {
    let href = item.href;
    if (item.collection !== undefined) {
      const collection = byId.get(item.collection);
      if (!collection) {
        throw new MakitError(
          "missing-navigation-target",
          `Global navigation item "${item.title}" references unknown collection "${item.collection}".`,
        );
      }
      href = buildRoute([], {
        basePath: config.basePath,
        localePrefix,
        collectionSegments: collection.pathSegments,
        trailingSlash: config.build.trailingSlash,
      });
    }
    return {
      title: item.title,
      href,
      collection: item.collection,
      external: item.external,
      items: item.items?.map(resolveItem),
    };
  };

  return groups.map((group) => ({ title: group.title, items: group.items.map(resolveItem) }));
}

/** `navigation[locale][collectionId]` (spec §40 layout). */
export interface GenerateAllNavigationResult {
  byLocale: Record<string, Record<string, ResolvedNavNode[]>>;
  warnings: string[];
  diagnostics: Diagnostic[];
  metadataPaths: string[];
}

/** Runs {@link generateNavigation} for every (locale, collection) pair. */
export async function generateAllNavigation(
  pages: readonly GeneratedPage[],
  config: ResolvedConfig,
  collections: readonly ResolvedCollection[],
  jiti: Jiti,
  metadataCache?: MetadataCache,
): Promise<GenerateAllNavigationResult> {
  const byLocale: Record<string, Record<string, ResolvedNavNode[]>> = {};
  const warnings: string[] = [];
  const diagnostics: Diagnostic[] = [];
  const metadataPaths = new Set<string>();

  for (const locale of config.i18n.locales) {
    byLocale[locale.urlLocale] = {};
    for (const collection of collections) {
      const result = await generateNavigation(
        pages,
        locale,
        config,
        collection,
        collections,
        jiti,
        metadataCache,
      );
      byLocale[locale.urlLocale]![collection.id] = result.navigation;
      warnings.push(...result.warnings);
      diagnostics.push(...result.diagnostics);
      for (const path of result.metadataPaths) metadataPaths.add(path);
    }
  }

  return { byLocale, warnings, diagnostics, metadataPaths: [...metadataPaths] };
}
