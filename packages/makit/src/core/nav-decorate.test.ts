import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import type { MakitConfigParsed } from "../config/schema.js";
import { createMetadataJiti } from "../metadata/loader.js";
import type { NavigationMetadata, PageMetadata } from "../metadata/types.js";
import { METADATA_ENTRY, buildPagesForTest, pageMetaSource } from "../testing/fixtures.js";
import type { ResolvedConfig } from "../types/resolved-config.js";
import { decoratePagesWithNavigation } from "./nav-decorate.js";
import { generateAllNavigation } from "./navigation.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "makit-nav-decorate-"));
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

async function writeNavigation(
  dirRelativePath: string,
  metadata: NavigationMetadata,
): Promise<void> {
  await write(
    `${dirRelativePath}/navigation.makit.ts`,
    `import { defineNavigation } from ${JSON.stringify(METADATA_ENTRY)};
export default defineNavigation(${JSON.stringify(metadata)});
`,
  );
}

function makeConfig(overrides: MakitConfigParsed): ResolvedConfig {
  return resolveConfig(overrides, { root: dir, configPath: join(dir, "makit.config.ts") });
}

/** Builds pages, resolves navigation, and decorates — the pipeline as `build.ts` runs it. */
async function decorate(config: ResolvedConfig) {
  const { pages, collections } = await buildPagesForTest(config);
  const { byLocale } = await generateAllNavigation(
    pages,
    config,
    collections,
    createMetadataJiti(),
  );
  return decoratePagesWithNavigation(pages, byLocale, config, collections);
}

describe("decoratePagesWithNavigation — breadcrumbs and hierarchy (spec §31, §39)", () => {
  it("builds Site > Section > Page breadcrumbs for an auto-nested page", async () => {
    await write("docs/guides/configuration.md", "# Configuration");
    const { pages } = await decorate(makeConfig({ title: "Docs" }));

    const page = pages[0]!;
    expect(page.hierarchy).toEqual([
      { type: "section", id: "guides", title: "Guides", href: undefined },
    ]);
    expect(page.breadcrumbs).toEqual([
      { title: "Home", href: "/" },
      { title: "Guides", href: undefined },
      { title: "Configuration", href: page.route },
    ]);
  });

  it("omits the collection ancestor for the implicit default collection", async () => {
    await write("docs/index.md", "# Home");
    const { pages } = await decorate(makeConfig({ title: "Docs" }));
    expect(pages[0]?.hierarchy).toEqual([]);
  });

  it("includes the collection as the first breadcrumb ancestor for an explicit collection", async () => {
    await write("docs/en-us/makit/index.md", "# Makit Home");
    await write("docs/en-us/makit/getting-started.md", "# Getting Started");
    const config = makeConfig({
      title: "Docs",
      i18n: { defaultLocale: "en-US", locales: [{ locale: "en-US" }] },
      collections: [{ id: "makit", title: "Makit", path: "/makit" }],
    });
    const { pages } = await decorate(config);
    const page = pages.find((p) => p.pageId === "getting-started")!;

    expect(page.hierarchy[0]).toMatchObject({ type: "collection", id: "makit", title: "Makit" });
    expect(page.breadcrumbs.map((b) => b.title)).toEqual(["Home", "Makit", "Getting Started"]);
  });

  it("respects breadcrumbs.enabled/showHome (spec §31 theme config)", async () => {
    await write("docs/guides/configuration.md", "# Configuration");

    const { pages: disabled } = await decorate(
      makeConfig({ title: "Docs", theme: { breadcrumbs: { enabled: false } } }),
    );
    expect(disabled[0]?.breadcrumbs).toEqual([]);

    const { pages: noHome } = await decorate(
      makeConfig({ title: "Docs", theme: { breadcrumbs: { showHome: false } } }),
    );
    expect(noHome[0]?.breadcrumbs[0]?.title).not.toBe("Home");
  });
});

describe("decoratePagesWithNavigation — canonical position (spec §30)", () => {
  async function multiPlacementFixture(): Promise<void> {
    await write("docs/getting-started.md", "# Getting Started");
    await write("docs/reference.md", "# Reference");
    await write("docs/configuration.md", "# Configuration");
    await writeNavigation("docs", {
      items: [
        {
          type: "section",
          id: "getting-started",
          title: "Getting Started",
          items: [
            { type: "page", page: "getting-started" },
            { type: "page", page: "configuration" },
          ],
        },
        {
          type: "section",
          id: "reference",
          title: "Reference",
          items: [
            { type: "page", page: "reference" },
            { type: "page", page: "configuration" },
          ],
        },
      ],
    });
  }

  it("uses navigation.primary to choose the canonical position among multiple placements", async () => {
    await multiPlacementFixture();
    await writeMeta("docs/configuration.md", { navigation: { primary: ["reference"] } });

    const { pages, diagnostics } = await decorate(makeConfig({ title: "Docs" }));
    const page = pages.find((p) => p.pageId === "configuration")!;

    expect(page.navigationPosition?.path).toEqual(["reference"]);
    expect(diagnostics.some((d) => d.code === "multiple-placement-without-primary")).toBe(false);
  });

  it("warns and falls back to the first occurrence when primary is unset", async () => {
    await multiPlacementFixture();

    const { pages, diagnostics } = await decorate(makeConfig({ title: "Docs" }));
    const page = pages.find((p) => p.pageId === "configuration")!;

    expect(page.navigationPosition?.path).toEqual(["getting-started"]);
    expect(diagnostics).toContainEqual(
      expect.objectContaining({ code: "multiple-placement-without-primary" }),
    );
  });

  it("throws missing-primary-position when primary matches no navigation position (spec §45)", async () => {
    await multiPlacementFixture();
    await writeMeta("docs/configuration.md", { navigation: { primary: ["does-not-exist"] } });

    await expect(decorate(makeConfig({ title: "Docs" }))).rejects.toMatchObject({
      code: "missing-primary-position",
    });
  });
});

describe("decoratePagesWithNavigation — pagination (spec §32)", () => {
  async function twoSectionFixture(): Promise<void> {
    await write("docs/guides/guide-one.md", "# One");
    await write("docs/guides/guide-two.md", "# Two");
    await write("docs/reference/ref-one.md", "# Ref One");
  }

  it("resolves prev/next across sections when crossSection is enabled (default)", async () => {
    await twoSectionFixture();
    const { pages } = await decorate(makeConfig({ title: "Docs" }));
    const refOne = pages.find((p) => p.pageId === "reference.ref-one")!;
    expect(refOne.navigationPosition?.prev?.pageId).toBe("guides.guide-two");
  });

  it("stops at section boundaries when crossSection is false", async () => {
    await twoSectionFixture();
    const config = makeConfig({
      title: "Docs",
      navigation: { pagination: { enabled: true, crossSection: false } },
    });
    const { pages } = await decorate(config);
    const refOne = pages.find((p) => p.pageId === "reference.ref-one")!;
    expect(refOne.navigationPosition?.prev).toBeUndefined();
  });

  it("omits prev/next entirely when pagination is disabled", async () => {
    await twoSectionFixture();
    const config = makeConfig({
      title: "Docs",
      navigation: { pagination: { enabled: false, crossSection: true } },
    });
    const { pages } = await decorate(config);
    const guideTwo = pages.find((p) => p.pageId === "guides.guide-two")!;
    expect(guideTwo.navigationPosition?.prev).toBeUndefined();
    expect(guideTwo.navigationPosition?.next).toBeUndefined();
  });
});
