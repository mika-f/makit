import { existsSync } from "node:fs";
import { join } from "node:path";
import fg from "fast-glob";
import type { Jiti } from "jiti";
import { loadMetadataFile, metadataLoadDiagnostics } from "../metadata/loader.js";
import type { CollectionMetadata } from "../metadata/types.js";
import type { ResolvedConfig, ResolvedLocaleConfig } from "../types/resolved-config.js";
import { MakitError } from "./errors.js";
import { localizeValue } from "./localize.js";
import type { Diagnostic } from "./validation.js";

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
  diagnostics: Diagnostic[];
}

function pathToSegments(path: string | undefined): string[] {
  if (!path) return [];
  return path.split("/").filter((segment) => segment.length > 0);
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
  diagnostics: Diagnostic[],
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
      diagnostics.push({
        code: "collection-fallback",
        message:
          `Collection "${id}" has no content in locale(s): ${missing.join(", ")} ` +
          `(collectionFallback.behavior: "${config.i18n.collectionFallback.behavior}")`,
        sourcePath: defaultLocaleSource.metadataPath ?? defaultLocaleSource.dir,
      });
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
 * The collection's title/description/etc. for a locale, honoring
 * `collectionFallback` (spec §35.5): the locale's own entry when present,
 * else the default locale's entry when the fallback behavior still renders
 * content (`"render"`/`"redirect"`), else `undefined` — the collection has
 * no presence in this locale at all (`"hidden"`/`"not-found"`, or the
 * default locale itself has no entry to fall back to). Used anywhere a
 * collection needs to be *displayed* (portal cards, the collection
 * switcher) for a locale it has no native metadata in.
 */
export function resolveCollectionLocale(
  collection: ResolvedCollection,
  locale: ResolvedLocaleConfig,
  config: ResolvedConfig,
): ResolvedCollectionLocale | undefined {
  const own = collection.locales[locale.urlLocale];
  if (own) return own;

  const behavior = config.i18n.collectionFallback.behavior;
  if (behavior === "hidden" || behavior === "not-found") return undefined;

  const defaultLocale = config.i18n.locales.find((l) => l.locale === config.i18n.defaultLocale);
  if (!defaultLocale) return undefined;
  return collection.locales[defaultLocale.urlLocale];
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
): Promise<{ sources: CollectionSource[]; diagnostics: Diagnostic[] }> {
  const sources: CollectionSource[] = [];
  const diagnostics: Diagnostic[] = [];

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
      diagnostics.push(...metadataLoadDiagnostics(loaded));
      sources.push({
        metadata: loaded.value,
        locale,
        dir: join(metadataPath, ".."),
        metadataPath,
        dependencies: loaded.dependencies,
      });
    }
  }

  return { sources, diagnostics };
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
  const diagnostics: Diagnostic[] = [];

  if (config.collections === undefined) {
    return { collections: [implicitCollection(config)], warnings, diagnostics };
  }

  let sources: CollectionSource[];
  if (Array.isArray(config.collections)) {
    sources = explicitCollectionSources(config, config.collections);
  } else {
    const discovered = await discoverCollectionSources(config, jiti);
    diagnostics.push(...discovered.diagnostics);
    sources = discovered.sources;
  }

  const collections = mergeCollectionSources(sources, config, diagnostics);
  if (collections.length === 0) {
    warnings.push(
      Array.isArray(config.collections)
        ? "No content directories found for the configured collections."
        : "No collection.makit.ts files found under the source directories.",
    );
  }

  return { collections, warnings, diagnostics };
}
