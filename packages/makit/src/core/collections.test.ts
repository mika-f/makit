import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import { createMetadataJiti } from "../metadata/loader.js";
import type { CollectionMetadata } from "../metadata/types.js";
import { METADATA_ENTRY } from "../testing/fixtures.js";
import { resolveCollections } from "./collections.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "makit-collections-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function write(relativePath: string, content: string): Promise<void> {
  const fullPath = join(dir, relativePath);
  await mkdir(join(fullPath, ".."), { recursive: true });
  await writeFile(fullPath, content, "utf-8");
}

function collectionSource(metadata: CollectionMetadata): string {
  return `import { defineCollection } from ${JSON.stringify(METADATA_ENTRY)};
export default defineCollection(${JSON.stringify(metadata)});
`;
}

function makeConfig(overrides: Record<string, unknown>) {
  return resolveConfig(
    { title: "Test", ...overrides },
    { root: dir, configPath: join(dir, "makit.config.ts") },
  );
}

const I18N = {
  defaultLocale: "en-US",
  locales: [{ locale: "en-US" }, { locale: "ja-JP" }],
};

describe("resolveCollections", () => {
  it("creates the implicit default collection when collections is omitted (spec §48.1)", async () => {
    const config = makeConfig({});
    const { collections } = await resolveCollections(config, createMetadataJiti());

    expect(collections).toHaveLength(1);
    expect(collections[0]).toMatchObject({
      id: "default",
      implicit: true,
      pathSegments: [],
      index: "index.md",
    });
    expect(collections[0]?.locales.en?.dir).toBe(join(dir, "docs"));
  });

  it("discovers collection.makit.ts in direct child directories per locale (spec §12)", async () => {
    await write(
      "docs/en-us/makit/collection.makit.ts",
      collectionSource({ id: "makit", title: "Makit", path: "/makit" }),
    );
    await write(
      "docs/ja-jp/makit/collection.makit.ts",
      collectionSource({ id: "makit", title: "Makit (ja)", path: "/makit" }),
    );
    await write(
      "docs/en-us/enduroq/collection.makit.ts",
      collectionSource({ id: "enduroq", title: "Enduroq", path: "/enduroq" }),
    );

    const config = makeConfig({ collections: { mode: "discover" }, i18n: I18N });
    const { collections, warnings } = await resolveCollections(config, createMetadataJiti());

    const makit = collections.find((c) => c.id === "makit");
    expect(makit).toMatchObject({ pathSegments: ["makit"], implicit: false });
    expect(makit?.locales["en-us"]?.title).toBe("Makit");
    expect(makit?.locales["ja-jp"]?.title).toBe("Makit (ja)");

    // enduroq exists only in en-us — flagged for collection fallback (spec §35.5).
    const enduroq = collections.find((c) => c.id === "enduroq");
    expect(enduroq?.locales["ja-jp"]).toBeUndefined();
    expect(warnings.some((w) => w.includes('"enduroq"') && w.includes("ja-jp"))).toBe(true);
  });

  it("resolves LocalizedValue titles per locale", async () => {
    await write(
      "docs/en-us/makit/collection.makit.ts",
      collectionSource({
        id: "makit",
        title: { "en-US": "Makit Docs", "ja-JP": "Makit ドキュメント" },
        path: "/makit",
      }),
    );
    await write(
      "docs/ja-jp/makit/collection.makit.ts",
      collectionSource({
        id: "makit",
        title: { "en-US": "Makit Docs", "ja-JP": "Makit ドキュメント" },
        path: "/makit",
      }),
    );

    const config = makeConfig({ collections: { mode: "discover" }, i18n: I18N });
    const { collections } = await resolveCollections(config, createMetadataJiti());

    expect(collections[0]?.locales["en-us"]?.title).toBe("Makit Docs");
    expect(collections[0]?.locales["ja-jp"]?.title).toBe("Makit ドキュメント");
  });

  it("supports explicitly configured collections rooted at {sourceDir}/{id} (spec §13)", async () => {
    await write("docs/en-us/makit/index.md", "# Makit\n");

    const config = makeConfig({
      collections: [{ id: "makit", title: "Makit", path: "/makit" }],
      i18n: I18N,
    });
    const { collections } = await resolveCollections(config, createMetadataJiti());

    expect(collections).toHaveLength(1);
    expect(collections[0]?.locales["en-us"]?.dir).toBe(join(dir, "docs", "en-us", "makit"));
    expect(collections[0]?.locales["ja-jp"]).toBeUndefined();
  });

  it("throws on duplicate collection ids within a locale (spec §45)", async () => {
    await write(
      "docs/en-us/a/collection.makit.ts",
      collectionSource({ id: "same", title: "A", path: "/a" }),
    );
    await write(
      "docs/en-us/b/collection.makit.ts",
      collectionSource({ id: "same", title: "B", path: "/b" }),
    );

    const config = makeConfig({ collections: { mode: "discover" }, i18n: I18N });
    await expect(resolveCollections(config, createMetadataJiti())).rejects.toMatchObject({
      code: "duplicate-collection-id",
    });
  });

  it("throws on duplicate collection paths (spec §45)", async () => {
    await write(
      "docs/en-us/a/collection.makit.ts",
      collectionSource({ id: "a", title: "A", path: "/shared" }),
    );
    await write(
      "docs/en-us/b/collection.makit.ts",
      collectionSource({ id: "b", title: "B", path: "/shared" }),
    );

    const config = makeConfig({ collections: { mode: "discover" }, i18n: I18N });
    await expect(resolveCollections(config, createMetadataJiti())).rejects.toMatchObject({
      code: "duplicate-collection-path",
    });
  });
});
