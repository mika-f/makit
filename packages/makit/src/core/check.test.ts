import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import type { MakitConfigParsed } from "../config/schema.js";
import type { ResolvedConfig } from "../types/resolved-config.js";
import { check } from "./check.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "makit-check-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function write(relativePath: string, content: string): Promise<void> {
  const fullPath = join(dir, relativePath);
  await mkdir(join(fullPath, ".."), { recursive: true });
  await writeFile(fullPath, content, "utf-8");
}

function makeConfig(overrides: MakitConfigParsed): ResolvedConfig {
  return resolveConfig(overrides, { root: dir, configPath: join(dir, "makit.config.ts") });
}

describe("check", () => {
  it("succeeds for a plain collection-less site", async () => {
    await write("docs/index.md", "# Home\n\nSee [about](./about.md).");
    await write("docs/about.md", "# About");
    const result = await check(makeConfig({ title: "Docs" }));
    expect(result.pageCount).toBe(2);
  });

  it("surfaces an invalid home config without a full build (spec §33, §42)", async () => {
    await write("docs/about.md", "# About");
    const config = makeConfig({
      title: "Docs",
      home: { layout: "page", page: "does-not-exist" },
    });
    await expect(check(config)).rejects.toMatchObject({ code: "home-page-not-found" });
  });
});
