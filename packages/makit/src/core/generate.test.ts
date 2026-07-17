import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import { createMetadataJiti } from "../metadata/loader.js";
import type { PageMetadata } from "../metadata/types.js";
import { buildPagesForTest, pageMetaSource } from "../testing/fixtures.js";
import { writeGeneratedData } from "./generate.js";
import { generateAllNavigation } from "./navigation.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "makit-generate-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function write(relativePath: string, content: string): Promise<void> {
  const fullPath = join(dir, relativePath);
  await mkdir(join(fullPath, ".."), { recursive: true });
  await writeFile(fullPath, content, "utf-8");
}

async function writeMeta(markdownRelativePath: string, metadata: PageMetadata): Promise<void> {
  await write(
    markdownRelativePath.replace(/\.(md|markdown)$/i, ".meta.ts"),
    pageMetaSource(metadata),
  );
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf-8"));
}

describe("writeGeneratedData (spec §40 layout)", () => {
  it("writes site.json, locales.json, collections.json, per-collection pages, and index maps", async () => {
    await write("docs/index.md", "# Home\n");
    await write("docs/guides/configuration.md", "# Configuration\n");
    await writeMeta("docs/guides/configuration.md", { id: "config" });

    const config = resolveConfig(
      { title: "My Docs" },
      { root: dir, configPath: join(dir, "makit.config.ts") },
    );
    const { pages, collections } = await buildPagesForTest(config);
    const { generatedDir } = await writeGeneratedData(config, pages, collections);

    expect(generatedDir).toBe(join(dir, ".makit", "generated"));

    const site = (await readJson(join(generatedDir, "site.json"))) as { title: string };
    expect(site.title).toBe("My Docs");

    const locales = (await readJson(join(generatedDir, "locales.json"))) as { enabled: boolean };
    expect(locales.enabled).toBe(false);

    // Collection-less sites get the implicit "default" collection (spec §48.1).
    const collectionsData = (await readJson(join(generatedDir, "collections.json"))) as {
      id: string;
      implicit: boolean;
    }[];
    expect(collectionsData).toHaveLength(1);
    expect(collectionsData[0]).toMatchObject({ id: "default", implicit: true });

    const indexPage = (await readJson(
      join(generatedDir, "pages", "en", "default", "index.json"),
    )) as { route: string };
    expect(indexPage.route).toBe("/");

    const configPage = (await readJson(
      join(generatedDir, "pages", "en", "default", "config.json"),
    )) as { route: string };
    expect(configPage.route).toBe("/guides/configuration/");

    const routeMap = (await readJson(join(generatedDir, "indexes", "route-map.json"))) as Record<
      string,
      Record<string, { collectionId: string; pageId: string }>
    >;
    expect(routeMap.en?.[""]).toMatchObject({ collectionId: "default", pageId: "index" });
    expect(routeMap.en?.["guides/configuration"]).toMatchObject({
      collectionId: "default",
      pageId: "config",
    });

    const pageMap = (await readJson(join(generatedDir, "indexes", "page-map.json"))) as Record<
      string,
      Record<string, Record<string, { route: string }>>
    >;
    expect(pageMap.en?.default?.config?.route).toBe("/guides/configuration/");

    const collectionMap = (await readJson(
      join(generatedDir, "indexes", "collection-map.json"),
    )) as Record<string, Record<string, string>>;
    expect(collectionMap.default?.en).toBe("/");
  });

  it("nests page JSON under locale and collection for i18n projects, and maps translations", async () => {
    await write("docs/en-us/index.md", "# Home\n");
    await write("docs/ja-jp/index.md", "# ホーム\n");

    const config = resolveConfig(
      {
        title: "My Docs",
        i18n: { defaultLocale: "en-US", locales: [{ locale: "en-US" }, { locale: "ja-JP" }] },
      },
      { root: dir, configPath: join(dir, "makit.config.ts") },
    );
    const { pages, collections } = await buildPagesForTest(config);
    const { generatedDir } = await writeGeneratedData(config, pages, collections);

    const enIndex = (await readJson(
      join(generatedDir, "pages", "en-us", "default", "index.json"),
    )) as { locale: string };
    const jaIndex = (await readJson(
      join(generatedDir, "pages", "ja-jp", "default", "index.json"),
    )) as { locale: string };
    expect(enIndex.locale).toBe("en-us");
    expect(jaIndex.locale).toBe("ja-jp");

    const translationMap = (await readJson(
      join(generatedDir, "indexes", "translation-map.json"),
    )) as Record<string, Record<string, string>>;
    expect(translationMap["default:index"]).toEqual({ "en-us": "/en-us/", "ja-jp": "/ja-jp/" });
  });

  it("writes global.json and one navigation file per (locale, collection)", async () => {
    await write("docs/en-us/index.md", "# Home\n");
    await write("docs/ja-jp/index.md", "# ホーム\n");

    const config = resolveConfig(
      {
        title: "My Docs",
        i18n: { defaultLocale: "en-US", locales: [{ locale: "en-US" }, { locale: "ja-JP" }] },
        navigation: {
          global: [{ title: "Products", items: [{ title: "Docs", collection: "default" }] }],
        },
      },
      { root: dir, configPath: join(dir, "makit.config.ts") },
    );
    const { pages, collections } = await buildPagesForTest(config);
    const { byLocale } = await generateAllNavigation(pages, config, collections, createMetadataJiti());
    const { generatedDir } = await writeGeneratedData(config, pages, collections, byLocale);

    const enNav = (await readJson(
      join(generatedDir, "navigation", "en-us", "default.json"),
    )) as unknown[];
    const jaNav = (await readJson(
      join(generatedDir, "navigation", "ja-jp", "default.json"),
    )) as unknown[];
    expect(enNav.length).toBeGreaterThan(0);
    expect(jaNav.length).toBeGreaterThan(0);

    // Global navigation resolves collection references per locale (spec §26).
    const enGlobal = (await readJson(join(generatedDir, "navigation", "en-us", "global.json"))) as {
      items: { title: string; href: string; collection: string }[];
    }[];
    expect(enGlobal[0]?.items[0]).toMatchObject({
      title: "Docs",
      href: "/en-us/",
      collection: "default",
    });
  });

  it("removes stale files from a previous generation", async () => {
    await write("docs/index.md", "# Home\n");
    const config = resolveConfig(
      { title: "My Docs" },
      { root: dir, configPath: join(dir, "makit.config.ts") },
    );
    const { pages, collections } = await buildPagesForTest(config);

    const staleDir = join(dir, ".makit", "generated");
    await mkdir(staleDir, { recursive: true });
    await writeFile(join(staleDir, "manifest.json"), "{}", "utf-8");

    const { generatedDir } = await writeGeneratedData(config, pages, collections);
    await expect(readJson(join(generatedDir, "manifest.json"))).rejects.toThrow();
  });
});
