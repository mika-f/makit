import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import type { MakitConfigParsed } from "../config/schema.js";
import { buildPagesForTest } from "../testing/fixtures.js";
import type { ResolvedConfig } from "../types/resolved-config.js";
import { synthesizeCollectionTopPages } from "./collection-top.js";
import { resolveHome } from "./home.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "makit-home-"));
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

/** `buildAllPages` + collection-top synthesis, mirroring the real pipeline order. */
async function buildWithTops(config: ResolvedConfig) {
  const { pages, collections } = await buildPagesForTest(config);
  const tops = synthesizeCollectionTopPages(pages, config, collections);
  return { pages: [...pages, ...tops], collections };
}

describe("resolveHome — default (no explicit layout, spec §33)", () => {
  it("uses the implicit collection's own index.md as-is", async () => {
    await write("docs/index.md", "# Home");
    const config = makeConfig({ title: "Docs" });
    const { pages, collections } = await buildWithTops(config);

    const home = resolveHome(config.i18n.locales[0]!, pages, config, collections);
    expect(home).toEqual({ kind: "existing" });
  });

  it("aliases the root to the single collection's top page when it has a non-empty path", async () => {
    await write("docs/makit/getting-started.md", "# Getting Started");
    const config = makeConfig({
      title: "Docs",
      collections: [{ id: "makit", title: "Makit", path: "/makit" }],
    });
    const { pages, collections } = await buildWithTops(config);

    const home = resolveHome(config.i18n.locales[0]!, pages, config, collections);
    expect(home).toEqual({ kind: "page", collectionId: "makit", pageId: "index" });
  });

  it("synthesizes a portal listing every visible collection when there are several", async () => {
    await write("docs/makit/index.md", "# Makit\n");
    await write("docs/enduroq/index.md", "# Enduroq\n");
    const config = makeConfig({
      title: "Docs",
      collections: [
        { id: "makit", title: "Makit", path: "/makit" },
        { id: "enduroq", title: "Enduroq", path: "/enduroq" },
        { id: "hidden-one", title: "Hidden", path: "/hidden", hidden: true },
      ],
    });
    await write("docs/hidden-one/index.md", "# Hidden\n");
    const { pages, collections } = await buildWithTops(config);

    const home = resolveHome(config.i18n.locales[0]!, pages, config, collections);
    expect(home.kind).toBe("portal");
    if (home.kind !== "portal") throw new Error("unreachable");
    expect(home.data.featuredCollections.map((c) => c.id).sort()).toEqual(["enduroq", "makit"]);
    expect(home.data.featuredCollections.find((c) => c.id === "makit")).toMatchObject({
      title: "Makit",
      href: "/makit/",
    });
  });
});

describe("resolveHome — layout: page", () => {
  it("aliases the root to the referenced page id", async () => {
    await write("docs/about.md", "# About");
    const config = makeConfig({ title: "Docs", home: { layout: "page", page: "about" } });
    const { pages, collections } = await buildWithTops(config);

    const home = resolveHome(config.i18n.locales[0]!, pages, config, collections);
    expect(home).toEqual({ kind: "page", collectionId: "default", pageId: "about" });
  });

  it("throws home-page-not-found for an unknown page id", async () => {
    await write("docs/about.md", "# About");
    const config = makeConfig({ title: "Docs", home: { layout: "page", page: "does-not-exist" } });
    const { pages, collections } = await buildWithTops(config);

    expect(() => resolveHome(config.i18n.locales[0]!, pages, config, collections)).toThrow(
      expect.objectContaining({ code: "home-page-not-found" }),
    );
  });

  it("throws home-root-conflict when a collection already owns the root", async () => {
    await write("docs/index.md", "# Home");
    await write("docs/about.md", "# About");
    const config = makeConfig({ title: "Docs", home: { layout: "page", page: "about" } });
    const { pages, collections } = await buildWithTops(config);

    expect(() => resolveHome(config.i18n.locales[0]!, pages, config, collections)).toThrow(
      expect.objectContaining({ code: "home-root-conflict" }),
    );
  });
});

describe("resolveHome — layout: portal", () => {
  it("resolves featuredCollections and sections to concrete cards", async () => {
    await write("docs/makit/index.md", "# Makit\n");
    await write("docs/enduroq/index.md", "# Enduroq\n");
    const config = makeConfig({
      title: "Docs",
      collections: [
        { id: "makit", title: "Makit", description: "Makit docs", path: "/makit" },
        { id: "enduroq", title: "Enduroq", path: "/enduroq" },
      ],
      home: {
        layout: "portal",
        featuredCollections: ["makit"],
        sections: [{ title: "Everything else", collections: ["enduroq"] }],
      },
    });
    const { pages, collections } = await buildWithTops(config);

    const home = resolveHome(config.i18n.locales[0]!, pages, config, collections);
    expect(home.kind).toBe("portal");
    if (home.kind !== "portal") throw new Error("unreachable");
    expect(home.data.featuredCollections).toEqual([
      { id: "makit", title: "Makit", description: "Makit docs", icon: undefined, href: "/makit/" },
    ]);
    expect(home.data.sections).toEqual([
      {
        title: "Everything else",
        collections: [
          {
            id: "enduroq",
            title: "Enduroq",
            description: undefined,
            icon: undefined,
            href: "/enduroq/",
          },
        ],
      },
    ]);
  });

  it("throws unknown-home-collection for an unresolvable collection id", async () => {
    await write("docs/makit/index.md", "# Makit\n");
    const config = makeConfig({
      title: "Docs",
      collections: [{ id: "makit", title: "Makit", path: "/makit" }],
      home: { layout: "portal", featuredCollections: ["does-not-exist"] },
    });
    const { pages, collections } = await buildWithTops(config);

    expect(() => resolveHome(config.i18n.locales[0]!, pages, config, collections)).toThrow(
      expect.objectContaining({ code: "unknown-home-collection" }),
    );
  });
});
