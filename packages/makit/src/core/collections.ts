import { existsSync } from "node:fs";
import { join } from "node:path";
import fg from "fast-glob";
import type { Jiti } from "jiti";
import { loadMetadataFile } from "../metadata/loader.js";
import type { CollectionMetadata, LocalizedValue } from "../metadata/types.js";
import type { ResolvedConfig, ResolvedLocaleConfig } from "../types/resolved-config.js";
import { MakitError } from "./errors.js";

/** The ID of the implicit collection created for collection-less sites (spec §48.1). */
export const IMPLICIT_COLLECTION_ID = "default";

export interface ResolvedCollectionLocale {
  title: string;
  description?: string;
  /** Absolute path to the collection's content directory for this locale. */
  dir: string;
  /** Absolute path of the locale's `collection.makit.ts` (absent for implicit/explicit collections). */
  metadataPath?: string;
  /** Local files imported by `collection.makit.ts`, for watching and cache keys. */
  dependencies: string[];
}

export interface ResolvedCollection {
  id: string;
  /** URL prefix segments from `path` — `"/makit"` → `["makit"]`, implicit → `[]` (spec §28.1). */
  pathSegments: string[];
  /** Collection top page file, relative to the collection directory (spec §34). */
  index: string;
  icon?: string;
  hidden: boolean;
  /** True for the synthesized collection of a collection-less site (spec §48.1). */
  implicit: boolean;
  seo?: CollectionMetadata["seo"];
  /** Per-locale presence, keyed by `urlLocale`. A missing locale means the collection has no content there (spec §35.5). */
  locales: Record<string, ResolvedCollectionLocale>;
}

export interface ResolveCollectionsResult {
  collections: ResolvedCollection[];
  warnings: string[];
}

function pathToSegments(path: string | undefined): string[] {
  if (!path) return [];
  return path.split("/").filter((segment) => segment.length > 0);
}

function localizeValue(
  value: string | LocalizedValue<string> | undefined,
  locale: ResolvedLocaleConfig,
  fallback?: string,
): string | undefined {
  if (value === undefined) return fallback;
  if (typeof value === "string") return value;
  return value[locale.locale] ?? value[locale.urlLocale] ?? Object.values(value)[0] ?? fallback;
}

interface CollectionSource {
  metadata: CollectionMetadata;
  locale: ResolvedLocaleConfig;
  dir: string;
  metadataPath?: string;
  dependencies: string[];
}

/**
 * Merges per-locale collection sources sharing the same `id` into one
 * `ResolvedCollection` (spec §12: same id across locales = translations of
 * one collection). Structural fields (`path`, `index`, `icon`, `hidden`)
 * come from the default locale's definition when present, else the first
 * seen; localized fields resolve per locale.
 */
function mergeCollectionSources(
  sources: CollectionSource[],
  config: ResolvedConfig,
  warnings: string[],
): ResolvedCollection[] {
  const byId = new Map<string, CollectionSource[]>();
  for (const source of sources) {
    const list = byId.get(source.metadata.id) ?? [];
    list.push(source);
    byId.set(source.metadata.id, list);
  }

  const collections: ResolvedCollection[] = [];
  const seenPaths = new Map<string, string>();

  for (const [id, group] of byId) {
    // Within one locale the same id may appear only once (spec §45).
    const seenLocales = new Map<string, CollectionSource>();
    for (const source of group) {
      const existing = seenLocales.get(source.locale.urlLocale);
      if (existing) {
        throw new MakitError(
          "duplicate-collection-id",
          `Duplicate collection id "${id}" in locale "${source.locale.urlLocale}":\n` +
            `  ${existing.metadataPath ?? existing.dir}\n  ${source.metadataPath ?? source.dir}`,
        );
      }
      seenLocales.set(source.locale.urlLocale, source);
    }

    const defaultLocaleSource =
      group.find((source) => source.locale.locale === config.i18n.defaultLocale) ?? group[0]!;
    const canonical = defaultLocaleSource.metadata;

    const pathSegments = pathToSegments(canonical.path);
    const pathKey = pathSegments.join("/");
    const pathOwner = seenPaths.get(pathKey);
    if (pathOwner !== undefined) {
      throw new MakitError(
        "duplicate-collection-path",
        `Collections "${pathOwner}" and "${id}" share the URL path "/${pathKey}" (spec §45).`,
      );
    }
    seenPaths.set(pathKey, id);

    const locales: Record<string, ResolvedCollectionLocale> = {};
    for (const [urlLocale, source] of seenLocales) {
      locales[urlLocale] = {
        title: localizeValue(source.metadata.title, source.locale, id)!,
        description: localizeValue(source.metadata.description, source.locale),
        dir: source.dir,
        metadataPath: source.metadataPath,
        dependencies: source.dependencies,
      };
    }

    if (config.i18n.enabled && Object.keys(locales).length < config.i18n.locales.length) {
      const missing = config.i18n.locales
        .filter((locale) => !(locale.urlLocale in locales))
        .map((locale) => locale.urlLocale);
      warnings.push(
        `Collection "${id}" has no content in locale(s): ${missing.join(", ")} ` +
          `(collectionFallback.behavior: "${config.i18n.collectionFallback.behavior}")`,
      );
    }

    collections.push({
      id,
      pathSegments,
      index: canonical.index ?? "index.md",
      icon: canonical.icon,
      hidden: canonical.hidden ?? false,
      implicit: false,
      seo: canonical.seo,
      locales,
    });
  }

  return collections;
}

/**
 * Scans each locale's sourceDir for `collection.makit.ts` files in direct
 * child directories (spec §12). Only depth-1 directories are considered —
 * the standard layout (spec §8) places collections at the top of each
 * locale's tree; nested collections are not supported.
 */
async function discoverCollectionSources(
  config: ResolvedConfig,
  jiti: Jiti,
): Promise<{ sources: CollectionSource[]; warnings: string[] }> {
  const sources: CollectionSource[] = [];
  const warnings: string[] = [];

  for (const locale of config.i18n.locales) {
    const sourceDirAbsolute = join(config.root, locale.sourceDir);
    if (!existsSync(sourceDirAbsolute)) continue;

    const matches = await fg("*/collection.makit.ts", {
      cwd: sourceDirAbsolute,
      absolute: true,
      dot: false,
    });

    for (const metadataPath of matches.sort()) {
      const loaded = await loadMetadataFile<CollectionMetadata>(metadataPath, "collection", {
        projectRoot: config.root,
        jiti,
      });
      warnings.push(...loaded.warnings.map((warning) => warning.message));
      sources.push({
        metadata: loaded.value,
        locale,
        dir: join(metadataPath, ".."),
        metadataPath,
        dependencies: loaded.dependencies,
      });
    }
  }

  return { sources, warnings };
}

/**
 * Builds `CollectionSource`s for explicitly configured collections
 * (spec §13). Content for collection `x` lives at `{localeSourceDir}/{x.id}/`
 * in each locale; locales without that directory are treated as missing the
 * collection (spec §35.5).
 */
function explicitCollectionSources(
  config: ResolvedConfig,
  metadataList: readonly CollectionMetadata[],
): CollectionSource[] {
  const sources: CollectionSource[] = [];

  for (const metadata of metadataList) {
    for (const locale of config.i18n.locales) {
      const dir = join(config.root, locale.sourceDir, metadata.id);
      if (!existsSync(dir)) continue;
      sources.push({ metadata, locale, dir, dependencies: [] });
    }
  }

  return sources;
}

function implicitCollection(config: ResolvedConfig): ResolvedCollection {
  const locales: Record<string, ResolvedCollectionLocale> = {};
  for (const locale of config.i18n.locales) {
    locales[locale.urlLocale] = {
      title: config.title,
      description: config.description,
      dir: join(config.root, locale.sourceDir),
      dependencies: [],
    };
  }
  return {
    id: IMPLICIT_COLLECTION_ID,
    pathSegments: [],
    index: "index.md",
    hidden: false,
    implicit: true,
    locales,
  };
}

/**
 * Resolves the site's collections from config (spec §12-13, §48.1):
 * an explicit `CollectionMetadata[]`, `{ mode: "discover" }`, or — when
 * `collections` is omitted — a single implicit collection spanning each
 * locale's whole sourceDir.
 */
export async function resolveCollections(
  config: ResolvedConfig,
  jiti: Jiti,
): Promise<ResolveCollectionsResult> {
  const warnings: string[] = [];

  if (config.collections === undefined) {
    return { collections: [implicitCollection(config)], warnings };
  }

  let sources: CollectionSource[];
  if (Array.isArray(config.collections)) {
    sources = explicitCollectionSources(config, config.collections);
  } else {
    const discovered = await discoverCollectionSources(config, jiti);
    warnings.push(...discovered.warnings);
    sources = discovered.sources;
  }

  const collections = mergeCollectionSources(sources, config, warnings);
  if (collections.length === 0) {
    warnings.push(
      Array.isArray(config.collections)
        ? "No content directories found for the configured collections."
        : "No collection.makit.ts files found under the source directories.",
    );
  }

  return { collections, warnings };
}
