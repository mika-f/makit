import type {
  CategoryMetadata,
  CollectionMetadata,
  NavigationMetadata,
  PageMetadata,
} from "./types.js";

/**
 * Discriminates which `define*` function produced a metadata value, so the
 * loader can verify a file default-exports the result of the *matching*
 * define function (spec §20).
 */
export type MetadataKind = "collection" | "navigation" | "category" | "page";

/**
 * `Symbol.for` so the brand survives when the user's project resolves a
 * different copy of the makit package than the CLI evaluating the file.
 */
export const METADATA_KIND = Symbol.for("makit.metadata.kind");

function brand<T extends object>(kind: MetadataKind, metadata: T): T {
  // Non-enumerable so the brand never leaks into serialization or spreads.
  Object.defineProperty(metadata, METADATA_KIND, {
    value: kind,
    enumerable: false,
    configurable: true,
  });
  return metadata;
}

/** Reads the metadata-kind brand from a loaded default export, if present. */
export function getMetadataKind(value: unknown): MetadataKind | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const kind = (value as Record<PropertyKey, unknown>)[METADATA_KIND];
  return typeof kind === "string" ? (kind as MetadataKind) : undefined;
}

/** Defines collection metadata for a `collection.makit.ts` file (spec §11). */
export function defineCollection(metadata: CollectionMetadata): CollectionMetadata {
  return brand("collection", metadata);
}

/** Defines manual navigation for a `navigation.makit.ts` file (spec §14). */
export function defineNavigation(metadata: NavigationMetadata): NavigationMetadata {
  return brand("navigation", metadata);
}

/** Defines section/group metadata for a `category.makit.ts` file (spec §15). */
export function defineCategory(metadata: CategoryMetadata): CategoryMetadata {
  return brand("category", metadata);
}

/** Defines page metadata for a `{filename}.meta.ts` file (spec §16). */
export function definePageMetadata(metadata: PageMetadata): PageMetadata {
  return brand("page", metadata);
}
