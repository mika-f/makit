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

describe("check static pages (STATIC-PAGES §16, §17)", () => {
  it("reports static page warnings and counts static pages", async () => {
    await write("docs/guide.md", "# Guide");
    await write("pages/about.html", "<p>About</p>");
    const result = await check(makeConfig({ title: "Docs" }));
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "static-page-missing-title",
    );
    expect(result.staticPageCount).toBe(1);
  });

  it("rejects a static index next to an explicit home layout", async () => {
    await write("docs/guide.md", "# Guide");
    await write("pages/index.tsx", "");
    await expect(
      check(makeConfig({ title: "Docs", home: { layout: "portal" } })),
    ).rejects.toMatchObject({ code: "static-page-home-conflict" });
  });

  it("rejects a static page on a Markdown page's URL", async () => {
    await write("docs/pricing.md", "# Pricing");
    await write("pages/pricing.tsx", "");
    await expect(check(makeConfig({ title: "Docs" }))).rejects.toMatchObject({
      code: "static-page-route-conflict",
    });
  });

  it("does not resolve the site home where a static index owns the root", async () => {
    // Two collections would otherwise resolve a portal; with a static index
    // the portal is never built, so its config is never consulted.
    await write("docs/makit/index.md", "# Makit");
    await write("docs/enduroq/index.md", "# Enduroq");
    await write("pages/index.tsx", "");
    const result = await check(
      makeConfig({
        title: "Docs",
        collections: [
          { id: "makit", title: "Makit", path: "/makit" },
          { id: "enduroq", title: "Enduroq", path: "/enduroq" },
        ],
      }),
    );
    expect(result.staticPageCount).toBe(1);
  });
});
