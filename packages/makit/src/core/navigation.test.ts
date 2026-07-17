import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import type { MakitConfigParsed } from "../config/schema.js";
import { createMetadataJiti } from "../metadata/loader.js";
import type { CategoryMetadata, NavigationMetadata, PageMetadata } from "../metadata/types.js";
import { METADATA_ENTRY, buildPagesForTest, pageMetaSource } from "../testing/fixtures.js";
import { generateFallbackPages } from "./i18n.js";
import type { ResolvedCollection } from "./collections.js";
import type { ResolvedNavContainerNode, ResolvedNavNode } from "./nav-nodes.js";
import { generateNavigation, resolveGlobalNavigation } from "./navigation.js";
import type { GeneratedPage } from "../types/page.js";
import type { ResolvedConfig } from "../types/resolved-config.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "makit-nav-"));
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

async function writeCategory(dirRelativePath: string, metadata: CategoryMetadata): Promise<void> {
  await write(
    `${dirRelativePath}/category.makit.ts`,
    `import { defineCategory } from ${JSON.stringify(METADATA_ENTRY)};
export default defineCategory(${JSON.stringify(metadata)});
`,
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

function makeConfig(overrides: MakitConfigParsed) {
  return resolveConfig(overrides, { root: dir, configPath: join(dir, "makit.config.ts") });
}

async function navFor(
  pages: readonly GeneratedPage[],
  config: ResolvedConfig,
  collections: readonly ResolvedCollection[],
  localeIndex = 0,
  collectionIndex = 0,
): Promise<ResolvedNavNode[]> {
  const { navigation } = await generateNavigation(
    pages,
    config.i18n.locales[localeIndex]!,
    config,
    collections[collectionIndex]!,
    collections,
    createMetadataJiti(),
  );
  return navigation;
}

function titles(nodes: readonly ResolvedNavNode[]): string[] {
  return nodes.map((node) => ("title" in node ? (node.title ?? "") : ""));
}

describe("generateNavigation (auto mode)", () => {
  it("builds top-level page nodes for root pages", async () => {
    await write("docs/index.md", "# Home");
    await write("docs/getting-started.md", "# Getting Started");
    const config = makeConfig({ title: "Test" });
    const { pages, collections } = await buildPagesForTest(config);

    const navigation = await navFor(pages, config, collections);
    expect(navigation.map((n) => n.type)).toEqual(["page", "page"]);
    expect(titles(navigation)).toEqual(["Home", "Getting Started"]);
  });

  it("turns a subdirectory into a section with its index page as the first item", async () => {
    await write("docs/guides/index.md", "# Guides");
    await writeMeta("docs/guides/index.md", { title: "Guides Overview" });
    await write("docs/guides/configuration.md", "# Configuration");
    const config = makeConfig({ title: "Test" });
    const { pages, collections } = await buildPagesForTest(config);

    const navigation = await navFor(pages, config, collections);
    const section = navigation.find((n): n is ResolvedNavContainerNode => n.type === "section");
    expect(section).toBeDefined();
    expect(section?.id).toBe("guides");
    expect(section?.title).toBe("Guides Overview");
    expect(section?.href).toBe("/guides/");
    expect(titles(section?.items ?? [])).toEqual(["Guides Overview", "Configuration"]);
  });

  it("applies category.makit.ts type/title/order/collapse settings (spec §15.3)", async () => {
    await write("docs/guides/configuration.md", "# Configuration");
    await writeCategory("docs/guides", {
      id: "guides",
      title: "All Guides",
      type: "group",
      order: 1,
      collapsible: true,
      collapsed: true,
    });
    await write("docs/reference/api.md", "# API");
    await writeCategory("docs/reference", { title: "Reference", order: 2 });
    const config = makeConfig({ title: "Test" });
    const { pages, collections } = await buildPagesForTest(config);

    const navigation = await navFor(pages, config, collections);
    expect(navigation).toHaveLength(2);
    expect(navigation[0]).toMatchObject({
      type: "group",
      id: "guides",
      title: "All Guides",
      collapsible: true,
      collapsed: true,
    });
    expect(navigation[1]).toMatchObject({ type: "section", title: "Reference" });
  });

  it("hides directories via category hidden and pages via .meta.ts hidden", async () => {
    await write("docs/index.md", "# Home");
    await write("docs/secret.md", "# Secret");
    await writeMeta("docs/secret.md", { hidden: true });
    await write("docs/internal/notes.md", "# Notes");
    await writeCategory("docs/internal", { hidden: true });
    const config = makeConfig({ title: "Test" });
    const { pages, collections } = await buildPagesForTest(config);

    const navigation = await navFor(pages, config, collections);
    expect(titles(navigation)).toEqual(["Home"]);
  });

  it("sorts siblings by order, then localized title, then name (spec §27)", async () => {
    await write("docs/b.md", "# B");
    await writeMeta("docs/b.md", { order: 1 });
    await write("docs/a.md", "# A");
    await writeMeta("docs/a.md", { order: 2 });
    await write("docs/c.md", "# C");
    const config = makeConfig({ title: "Test" });
    const { pages, collections } = await buildPagesForTest(config);

    const navigation = await navFor(pages, config, collections);
    expect(titles(navigation)).toEqual(["B", "A", "C"]);
  });

  it("uses navigation.title as a label override", async () => {
    await write("docs/getting-started.md", "# Getting Started");
    await writeMeta("docs/getting-started.md", {
      title: "Getting Started",
      navigation: { title: "Start Here" },
    });
    const config = makeConfig({ title: "Test" });
    const { pages, collections } = await buildPagesForTest(config);

    const navigation = await navFor(pages, config, collections);
    expect(titles(navigation)).toEqual(["Start Here"]);
  });

  it("excludes fallback pages when includeFallbackPages is false", async () => {
    await write("docs/en-us/guides/deployment.md", "# Deployment Guide");
    const config = makeConfig({
      title: "Test",
      i18n: { defaultLocale: "en-US", locales: [{ locale: "en-US" }, { locale: "ja-JP" }] },
      navigation: { includeFallbackPages: false },
    });
    const { pages, collections } = await buildPagesForTest(config);
    const allPages = [...pages, ...generateFallbackPages(pages, config)];

    const navigation = await navFor(allPages, config, collections, 1);
    expect(navigation).toHaveLength(0);
  });

  it("includes fallback pages by default", async () => {
    await write("docs/en-us/guides/deployment.md", "# Deployment Guide");
    const config = makeConfig({
      title: "Test",
      i18n: { defaultLocale: "en-US", locales: [{ locale: "en-US" }, { locale: "ja-JP" }] },
    });
    const { pages, collections } = await buildPagesForTest(config);
    const allPages = [...pages, ...generateFallbackPages(pages, config)];

    const navigation = await navFor(allPages, config, collections, 1);
    expect(navigation.length).toBeGreaterThan(0);
  });
});

describe("generateNavigation (navigation.makit.ts manual mode)", () => {
  it("resolves page references and sections from navigation.makit.ts (spec §14)", async () => {
    await write("docs/index.md", "# Overview");
    await writeMeta("docs/index.md", { id: "overview" });
    await write("docs/install.md", "# Installation");
    await writeMeta("docs/install.md", { id: "installation" });
    await writeNavigation("docs", {
      items: [
        { type: "page", page: "overview" },
        {
          type: "section",
          id: "getting-started",
          title: "Getting Started",
          collapsible: true,
          items: [{ type: "page", page: "installation", title: "Install" }],
        },
        { type: "link", title: "GitHub", href: "https://github.com/example", external: true },
      ],
    });
    const config = makeConfig({ title: "Test" });
    const { pages, collections } = await buildPagesForTest(config);

    const navigation = await navFor(pages, config, collections);
    expect(navigation[0]).toMatchObject({ type: "page", pageId: "overview", href: "/" });
    expect(navigation[1]).toMatchObject({
      type: "section",
      id: "getting-started",
      collapsible: true,
      items: [{ type: "page", pageId: "installation", title: "Install" }],
    });
    expect(navigation[2]).toMatchObject({ type: "link", external: true });
  });

  it("errors on unknown page references (spec §45)", async () => {
    await write("docs/index.md", "# Overview");
    await writeNavigation("docs", { items: [{ type: "page", page: "does-not-exist" }] });
    const config = makeConfig({ title: "Test" });
    const { pages, collections } = await buildPagesForTest(config);

    await expect(navFor(pages, config, collections)).rejects.toMatchObject({
      code: "missing-navigation-target",
    });
  });

  it("errors when explicit config manual navigation conflicts with navigation.makit.ts (spec §25)", async () => {
    await write("docs/index.md", "# Overview");
    await writeMeta("docs/index.md", { id: "overview" });
    await writeNavigation("docs", { items: [{ type: "page", page: "overview" }] });
    const config = makeConfig({
      title: "Test",
      navigation: {
        collections: {
          default: { mode: "manual", items: [{ type: "page", page: "overview" }] },
        },
      },
    });
    const { pages, collections } = await buildPagesForTest(config);

    await expect(navFor(pages, config, collections)).rejects.toMatchObject({
      code: "navigation-source-conflict",
    });
  });

  it("prefers explicit config manual navigation when no navigation.makit.ts exists", async () => {
    await write("docs/index.md", "# Overview");
    await writeMeta("docs/index.md", { id: "overview" });
    await write("docs/other.md", "# Other");
    const config = makeConfig({
      title: "Test",
      navigation: {
        collections: {
          default: { mode: "manual", items: [{ type: "page", page: "overview" }] },
        },
      },
    });
    const { pages, collections } = await buildPagesForTest(config);

    const navigation = await navFor(pages, config, collections);
    expect(navigation).toHaveLength(1);
    expect(navigation[0]).toMatchObject({ type: "page", pageId: "overview" });
  });

  it("forces auto mode via explicit config even when navigation.makit.ts exists (spec §25 priority)", async () => {
    await write("docs/index.md", "# Overview");
    await writeMeta("docs/index.md", { id: "overview" });
    await write("docs/other.md", "# Other");
    await writeNavigation("docs", { items: [{ type: "page", page: "overview" }] });
    const config = makeConfig({
      title: "Test",
      navigation: { collections: { default: { mode: "auto" } } },
    });
    const { pages, collections } = await buildPagesForTest(config);

    const navigation = await navFor(pages, config, collections);
    // Auto mode lists both pages, not just the manually referenced one.
    expect(navigation).toHaveLength(2);
  });
});

describe("generateNavigation (legacy site-level manual mode)", () => {
  it("converts configured groups into section nodes with resolved page refs", async () => {
    await write("docs/getting-started.md", "# Getting Started");
    const config = makeConfig({
      title: "Test",
      navigation: {
        mode: "manual",
        locales: {
          en: [{ title: "Guide", items: [{ title: "Getting Started", href: "/getting-started" }] }],
        },
      },
    });
    const { pages, collections } = await buildPagesForTest(config);

    const navigation = await navFor(pages, config, collections);
    expect(navigation).toHaveLength(1);
    expect(navigation[0]).toMatchObject({
      type: "section",
      title: "Guide",
      items: [{ type: "page", pageId: "getting-started" }],
    });
  });

  it("warns when a configured href does not match any real page route", async () => {
    await write("docs/index.md", "# Home");
    const config = makeConfig({
      title: "Test",
      navigation: {
        mode: "manual",
        locales: { en: [{ items: [{ title: "Missing", href: "/does-not-exist" }] }] },
      },
    });
    const { pages, collections } = await buildPagesForTest(config);

    const { warnings } = await generateNavigation(
      pages,
      config.i18n.locales[0]!,
      config,
      collections[0]!,
      collections,
      createMetadataJiti(),
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("/does-not-exist");
  });
});

describe("resolveGlobalNavigation", () => {
  it("resolves collection references to per-locale root routes (spec §26)", async () => {
    await write("docs/index.md", "# Home");
    const config = makeConfig({
      title: "Test",
      navigation: {
        global: [{ title: "Products", items: [{ title: "Docs", collection: "default" }] }],
      },
    });
    const { collections } = await buildPagesForTest(config);

    const resolved = resolveGlobalNavigation(
      config.navigation.global,
      config.i18n.locales[0]!,
      config,
      collections,
    );
    expect(resolved[0]?.items[0]).toMatchObject({ title: "Docs", href: "/" });
  });

  it("errors on unknown collection references", async () => {
    await write("docs/index.md", "# Home");
    const config = makeConfig({
      title: "Test",
      navigation: {
        global: [{ title: "Products", items: [{ title: "Nope", collection: "missing" }] }],
      },
    });
    const { collections } = await buildPagesForTest(config);

    expect(() =>
      resolveGlobalNavigation(
        config.navigation.global,
        config.i18n.locales[0]!,
        config,
        collections,
      ),
    ).toThrowError(/unknown collection/);
  });
});
