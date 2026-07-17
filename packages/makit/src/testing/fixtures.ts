import { fileURLToPath } from "node:url";
import { createMetadataJiti } from "../metadata/loader.js";
import type { PageMetadata } from "../metadata/types.js";
import type { ResolvedConfig } from "../types/resolved-config.js";
import { resolveCollections, type ResolvedCollection } from "../core/collections.js";
import { buildAllPages, type BuildAllPagesResult } from "../core/pages.js";

/**
 * Test-only helpers for writing `.meta.ts` fixtures. Fixture files live in
 * temp directories with no node_modules, so they import the define functions
 * by absolute path instead of the package specifier.
 */
export const METADATA_ENTRY = fileURLToPath(new URL("../metadata/index.ts", import.meta.url));

/** Source text of a `{page}.meta.ts` fixture for the given metadata. */
export function pageMetaSource(metadata: PageMetadata): string {
  return `import { definePageMetadata } from ${JSON.stringify(METADATA_ENTRY)};
export default definePageMetadata(${JSON.stringify(metadata)});
`;
}

/** Resolves the config's collections the way the real pipeline does. */
export async function testCollections(config: ResolvedConfig): Promise<ResolvedCollection[]> {
  const { collections } = await resolveCollections(config, createMetadataJiti());
  return collections;
}

export interface BuildPagesForTestResult extends BuildAllPagesResult {
  collections: ResolvedCollection[];
}

/** `resolveCollections` + `buildAllPages` in one step for pipeline tests. */
export async function buildPagesForTest(config: ResolvedConfig): Promise<BuildPagesForTestResult> {
  const collections = await testCollections(config);
  const result = await buildAllPages(config, collections);
  return { ...result, collections };
}
