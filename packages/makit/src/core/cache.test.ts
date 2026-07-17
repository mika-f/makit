import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import { BuildCache } from "./cache.js";

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
