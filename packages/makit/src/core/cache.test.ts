import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import { loadMetadataFile } from "../metadata/loader.js";
import { BuildCache, MetadataCache } from "./cache.js";

const METADATA_ENTRY = fileURLToPath(new URL("../metadata/index.ts", import.meta.url));

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "makit-cache-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function writeConfigFile(content: string): Promise<string> {
  const path = join(dir, "makit.config.ts");
  await writeFile(path, content, "utf-8");
  return path;
}

describe("BuildCache", () => {
  it("returns undefined for a miss and stores/retrieves a hit", async () => {
    const configPath = await writeConfigFile("export default { title: 'Test' };");
    const config = resolveConfig({ title: "Test" }, { root: dir, configPath });
    const cache = await BuildCache.create(config);
    expect(cache).toBeDefined();

    const result = { html: "<p>hi</p>", headings: [], warnings: [] };
    expect(await cache!.get("# Hi", "index.md", undefined, "default")).toBeUndefined();

    await cache!.set("# Hi", "index.md", undefined, "default", result);
    expect(await cache!.get("# Hi", "index.md", undefined, "default")).toEqual(result);
  });

  it("misses when the source content changes", async () => {
    const configPath = await writeConfigFile("export default { title: 'Test' };");
    const config = resolveConfig({ title: "Test" }, { root: dir, configPath });
    const cache = await BuildCache.create(config);

    await cache!.set("# Hi", "index.md", undefined, "default", {
      html: "<p>hi</p>",
      headings: [],
      warnings: [],
    });
    expect(await cache!.get("# Bye", "index.md", undefined, "default")).toBeUndefined();
  });

  it("misses when the config file content changes", async () => {
    const configPath = await writeConfigFile("export default { title: 'Test' };");
    const config = resolveConfig({ title: "Test" }, { root: dir, configPath });
    const cacheBefore = await BuildCache.create(config);
    await cacheBefore!.set("# Hi", "index.md", undefined, "default", {
      html: "<p>hi</p>",
      headings: [],
      warnings: [],
    });

    await writeConfigFile("export default { title: 'Test Changed' };");
    const cacheAfter = await BuildCache.create(config);
    expect(await cacheAfter!.get("# Hi", "index.md", undefined, "default")).toBeUndefined();
  });

  it("misses when the same content moves to a different path", async () => {
    const configPath = await writeConfigFile("export default { title: 'Test' };");
    const config = resolveConfig({ title: "Test" }, { root: dir, configPath });
    const cache = await BuildCache.create(config);

    await cache!.set("# Hi", "index.md", undefined, "default", {
      html: "<p>hi</p>",
      headings: [],
      warnings: [],
    });
    expect(await cache!.get("# Hi", "guides/index.md", undefined, "default")).toBeUndefined();
  });

  it("misses when the locale prefix differs (affects link rewriting)", async () => {
    const configPath = await writeConfigFile("export default { title: 'Test' };");
    const config = resolveConfig({ title: "Test" }, { root: dir, configPath });
    const cache = await BuildCache.create(config);

    await cache!.set("# Hi", "index.md", "en-us", "default", {
      html: "<p>hi</p>",
      headings: [],
      warnings: [],
    });
    expect(await cache!.get("# Hi", "index.md", "ja-jp", "default")).toBeUndefined();
  });

  it("misses when the same relative path belongs to a different collection (affects link rewriting)", async () => {
    const configPath = await writeConfigFile("export default { title: 'Test' };");
    const config = resolveConfig({ title: "Test" }, { root: dir, configPath });
    const cache = await BuildCache.create(config);

    await cache!.set("# Hi", "index.md", undefined, "makit", {
      html: "<p>hi</p>",
      headings: [],
      warnings: [],
    });
    expect(await cache!.get("# Hi", "index.md", undefined, "enduroq")).toBeUndefined();
  });

  it("returns undefined instead of throwing when the config file cannot be read", async () => {
    const config = resolveConfig(
      { title: "Test" },
      { root: dir, configPath: join(dir, "does-not-exist.ts") },
    );
    const cache = await BuildCache.create(config);
    expect(cache).toBeUndefined();
  });
});

describe("MetadataCache (spec §22)", () => {
  async function writeFileAt(relativePath: string, content: string): Promise<string> {
    const path = join(dir, relativePath);
    await writeFile(path, content, "utf-8");
    return path;
  }

  it("returns undefined for a miss and stores/retrieves a hit", async () => {
    const configPath = await writeFileAt("makit.config.ts", "export default { title: 'Test' };");
    const config = resolveConfig({ title: "Test" }, { root: dir, configPath });
    const cache = await MetadataCache.create(config);
    expect(cache).toBeDefined();

    const metaPath = await writeFileAt("index.meta.ts", "// v1");
    expect(await cache!.get("page", metaPath, [])).toBeUndefined();

    await cache!.set("page", metaPath, [], { id: "index" });
    expect(await cache!.get("page", metaPath, [])).toEqual({ value: { id: "index" } });
  });

  it("misses when the metadata file's own content changes", async () => {
    const configPath = await writeFileAt("makit.config.ts", "export default { title: 'Test' };");
    const config = resolveConfig({ title: "Test" }, { root: dir, configPath });
    const cache = await MetadataCache.create(config);
    const metaPath = await writeFileAt("index.meta.ts", "// v1");

    await cache!.set("page", metaPath, [], { id: "index" });
    await writeFileAt("index.meta.ts", "// v2");
    expect(await cache!.get("page", metaPath, [])).toBeUndefined();
  });

  it("misses when a dependency's content changes", async () => {
    const configPath = await writeFileAt("makit.config.ts", "export default { title: 'Test' };");
    const config = resolveConfig({ title: "Test" }, { root: dir, configPath });
    const cache = await MetadataCache.create(config);
    const metaPath = await writeFileAt("index.meta.ts", "// entry");
    const depPath = await writeFileAt("shared.ts", "export const order = 1;");

    await cache!.set("page", metaPath, [depPath], { id: "index" });
    expect(await cache!.get("page", metaPath, [depPath])).toEqual({ value: { id: "index" } });

    await writeFileAt("shared.ts", "export const order = 2;");
    expect(await cache!.get("page", metaPath, [depPath])).toBeUndefined();
  });

  it("misses when the same file is queried under a different metadata kind", async () => {
    const configPath = await writeFileAt("makit.config.ts", "export default { title: 'Test' };");
    const config = resolveConfig({ title: "Test" }, { root: dir, configPath });
    const cache = await MetadataCache.create(config);
    const metaPath = await writeFileAt("shared.makit.ts", "// entry");

    await cache!.set("collection", metaPath, [], { id: "makit" });
    expect(await cache!.get("category", metaPath, [])).toBeUndefined();
  });

  it("misses when the config file content changes", async () => {
    const configPath = await writeFileAt("makit.config.ts", "export default { title: 'Test' };");
    const config = resolveConfig({ title: "Test" }, { root: dir, configPath });
    const cacheBefore = await MetadataCache.create(config);
    const metaPath = await writeFileAt("index.meta.ts", "// entry");
    await cacheBefore!.set("page", metaPath, [], { id: "index" });

    await writeFileAt("makit.config.ts", "export default { title: 'Test Changed' };");
    const cacheAfter = await MetadataCache.create(config);
    expect(await cacheAfter!.get("page", metaPath, [])).toBeUndefined();
  });

  it("returns undefined instead of throwing when a dependency has vanished", async () => {
    const configPath = await writeFileAt("makit.config.ts", "export default { title: 'Test' };");
    const config = resolveConfig({ title: "Test" }, { root: dir, configPath });
    const cache = await MetadataCache.create(config);
    const metaPath = await writeFileAt("index.meta.ts", "// entry");

    await expect(
      cache!.get("page", metaPath, [join(dir, "does-not-exist.ts")]),
    ).resolves.toBeUndefined();
  });

  it("skips re-evaluating loadMetadataFile on a cache hit", async () => {
    const configPath = await writeFileAt("makit.config.ts", "export default { title: 'Test' };");
    const config = resolveConfig({ title: "Test" }, { root: dir, configPath });
    const cache = await MetadataCache.create(config);
    const counterPath = join(dir, "eval-count.txt");
    await writeFile(counterPath, "", "utf-8");

    const metaPath = await writeFileAt(
      "collection.makit.ts",
      `import { appendFileSync } from "node:fs";
import { defineCollection } from ${JSON.stringify(METADATA_ENTRY)};
appendFileSync(${JSON.stringify(counterPath)}, "x");
export default defineCollection({ id: "makit", title: "Makit" });
`,
    );

    const first = await loadMetadataFile(metaPath, "collection", { projectRoot: dir, cache });
    const second = await loadMetadataFile(metaPath, "collection", { projectRoot: dir, cache });

    expect(first.value).toEqual({ id: "makit", title: "Makit" });
    expect(second.value).toEqual({ id: "makit", title: "Makit" });
    expect(second.evalDurationMs).toBe(0);
    expect(await readFile(counterPath, "utf-8")).toBe("x");
  });
});
