import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import type { MakitConfigParsed } from "../config/schema.js";
import { buildPagesForTest } from "../testing/fixtures.js";
import type { ResolvedConfig } from "../types/resolved-config.js";
import { synthesizeCollectionTopPages } from "./collection-top.js";
import { generateFallbackPages } from "./i18n.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "makit-collection-top-"));
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

const I18N = {
  defaultLocale: "en-US",
  locales: [{ locale: "en-US" }, { locale: "ja-JP" }],
};

describe("synthesizeCollectionTopPages (spec §34)", () => {
  it("synthesizes a top page from collection metadata when there is no index.md", async () => {
    await write("docs/makit/getting-started.md", "# Getting Started");
    const config = makeConfig({
      title: "Docs",
      collections: [
        { id: "makit", title: "Makit", description: "Makit documentation", path: "/makit" },
      ],
    });
    const { pages, collections } = await buildPagesForTest(config);

    const [top] = synthesizeCollectionTopPages(pages, config, collections);

    expect(top).toMatchObject({
      pageId: "index",
      collectionId: "makit",
      route: "/makit/",
      title: "Makit",
      description: "Makit documentation",
    });
    expect(top?.html).toContain("Makit documentation");
    expect(top?.html).toContain('href="/makit/getting-started/"');
  });

  it("does nothing when a real index.md already exists", async () => {
    await write("docs/makit/index.md", "# Makit\n");
    const config = makeConfig({
      title: "Docs",
      collections: [{ id: "makit", title: "Makit", path: "/makit" }],
    });
    const { pages, collections } = await buildPagesForTest(config);

    expect(synthesizeCollectionTopPages(pages, config, collections)).toEqual([]);
  });

  it("does nothing when the real index.md sits inside a route group (ROUTE-GROUPS §4)", async () => {
    await write("docs/makit/(marketing)/index.md", "# Makit\n");
    const config = makeConfig({
      title: "Docs",
      collections: [{ id: "makit", title: "Makit", path: "/makit" }],
    });
    const { pages, collections } = await buildPagesForTest(config);

    expect(synthesizeCollectionTopPages(pages, config, collections)).toEqual([]);
  });

  it("does nothing for the implicit default collection", async () => {
    await write("docs/guides/configuration.md", "# Configuration");
    const config = makeConfig({ title: "Docs" });
    const { pages, collections } = await buildPagesForTest(config);

    expect(synthesizeCollectionTopPages(pages, config, collections)).toEqual([]);
  });

  it("is skipped when an i18n fallback page already fills the slot", async () => {
    await write("docs/en-us/makit/index.md", "# Makit\n");
    const config = makeConfig({
      title: "Docs",
      i18n: I18N,
      collections: [{ id: "makit", title: "Makit", path: "/makit" }],
    });
    const { pages, collections } = await buildPagesForTest(config);
    const fallbackPages = generateFallbackPages(pages, config);

    expect(fallbackPages.some((p) => p.locale === "ja-jp" && p.pathSegments.length === 0)).toBe(
      true,
    );
    expect(synthesizeCollectionTopPages([...pages, ...fallbackPages], config, collections)).toEqual(
      [],
    );
  });

  it("synthesizes independently per locale when no locale has a real index.md", async () => {
    await write("docs/en-us/makit/getting-started.md", "# Getting Started");
    await write("docs/ja-jp/makit/getting-started.md", "# はじめに");
    const config = makeConfig({
      title: "Docs",
      i18n: I18N,
      collections: [
        {
          id: "makit",
          title: { "en-US": "Makit", "ja-JP": "メイキット" },
          path: "/makit",
        },
      ],
    });
    const { pages, collections } = await buildPagesForTest(config);
    const fallbackPages = generateFallbackPages(pages, config);
    expect(fallbackPages).toEqual([]);

    const tops = synthesizeCollectionTopPages([...pages, ...fallbackPages], config, collections);

    expect(tops).toHaveLength(2);
    expect(tops.find((p) => p.locale === "en-us")?.title).toBe("Makit");
    expect(tops.find((p) => p.locale === "ja-jp")?.title).toBe("メイキット");
  });

  it("lists pages by numeric filename prefix when no explicit order is set (ORDER-PREFIX §3)", async () => {
    await write("docs/makit/02-configuration.md", "# Configuration");
    await write("docs/makit/01-installation.md", "# Installation");
    const config = makeConfig({
      title: "Docs",
      collections: [{ id: "makit", title: "Makit", path: "/makit" }],
    });
    const { pages, collections } = await buildPagesForTest(config);

    const [top] = synthesizeCollectionTopPages(pages, config, collections);
    const installationIndex = top?.html.indexOf("Installation") ?? -1;
    const configurationIndex = top?.html.indexOf("Configuration") ?? -1;
    expect(installationIndex).toBeGreaterThanOrEqual(0);
    expect(installationIndex).toBeLessThan(configurationIndex);
  });
});
