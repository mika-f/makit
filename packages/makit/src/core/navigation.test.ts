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

  it("orders siblings by numeric filename prefix (ORDER-PREFIX §1)", async () => {
    await write("docs/02-b.md", "# B");
    await write("docs/01-a.md", "# A");
    await write("docs/03-c.md", "# C");
    const config = makeConfig({ title: "Test" });
    const { pages, collections } = await buildPagesForTest(config);

    const navigation = await navFor(pages, config, collections);
    expect(titles(navigation)).toEqual(["A", "B", "C"]);
  });

  it("compares prefixes numerically, not lexicographically, across digit widths (ORDER-PREFIX §2, §3)", async () => {
    await write("docs/2-b.md", "# B");
    await write("docs/10-c.md", "# C");
    await write("docs/100-d.md", "# D");
    await write("docs/1-a.md", "# A");
    const config = makeConfig({ title: "Test" });
    const { pages, collections } = await buildPagesForTest(config);

    const navigation = await navFor(pages, config, collections);
    expect(titles(navigation)).toEqual(["A", "B", "C", "D"]);
  });

  it("orders a subdirectory by its own numeric prefix (ORDER-PREFIX §8)", async () => {
    await write("docs/02-guides/config.md", "# Config");
    await writeCategory("docs/02-guides", { title: "Guides" });
    await write("docs/01-overview.md", "# Overview");
    const config = makeConfig({ title: "Test" });
    const { pages, collections } = await buildPagesForTest(config);

    const navigation = await navFor(pages, config, collections);
    expect(titles(navigation)).toEqual(["Overview", "Guides"]);
  });

  it("explicit order beats a numeric filename prefix (ORDER-PREFIX §9)", async () => {
    await write("docs/02-b.md", "# B");
    await write("docs/01-a.md", "# A");
    await writeMeta("docs/01-a.md", { order: 5 });
    const config = makeConfig({ title: "Test" });
    const { pages, collections } = await buildPagesForTest(config);

    const navigation = await navFor(pages, config, collections);
    expect(titles(navigation)).toEqual(["B", "A"]);
  });

  it("places unprefixed items last by default, or first with unorderedPosition (ORDER-PREFIX §9)", async () => {
    await write("docs/01-a.md", "# A");
    await write("docs/plain.md", "# Plain");
    const configLast = makeConfig({ title: "Test" });
    const { pages: pagesLast, collections: collectionsLast } = await buildPagesForTest(configLast);
    expect(titles(await navFor(pagesLast, configLast, collectionsLast))).toEqual(["A", "Plain"]);

    const configFirst = makeConfig({
      title: "Test",
      navigation: { auto: { unorderedPosition: "first" } },
    });
    const { pages: pagesFirst, collections: collectionsFirst } =
      await buildPagesForTest(configFirst);
    expect(titles(await navFor(pagesFirst, configFirst, collectionsFirst))).toEqual(["Plain", "A"]);
  });

  it("warns on duplicate navigation order from colliding prefixes (ORDER-PREFIX §10)", async () => {
    await write("docs/01-a.md", "# A");
    await write("docs/01-b.md", "# B");
    const config = makeConfig({ title: "Test" });
    const { pages, collections } = await buildPagesForTest(config);

    const { diagnostics } = await generateNavigation(
      pages,
      config.i18n.locales[0]!,
      config,
      collections[0]!,
      collections,
      createMetadataJiti(),
    );
    expect(diagnostics).toContainEqual(
      expect.objectContaining({ code: "duplicate-navigation-order" }),
    );
  });

  it("still finds category.makit.ts under a numerically prefixed directory (ORDER-PREFIX §12)", async () => {
    await write("docs/02-guides/config.md", "# Config");
    await writeCategory("docs/02-guides", { title: "All Guides", order: 5 });
    const config = makeConfig({ title: "Test" });
    const { pages, collections } = await buildPagesForTest(config);

    const navigation = await navFor(pages, config, collections);
    expect(titles(navigation)).toEqual(["All Guides"]);
    const section = navigation.find(
      (n): n is ResolvedNavContainerNode => n.type === "section" || n.type === "group",
    );
    expect(section?.id).toBe("guides");
  });

  it("throws MakitError('duplicate-normalized-directory') when two directories normalize to the same name (ORDER-PREFIX §22)", async () => {
    await write("docs/02-guides/a.md", "# A");
    await write("docs/2-guides/b.md", "# B");
    const config = makeConfig({ title: "Test" });
    const { pages, collections } = await buildPagesForTest(config);

    await expect(navFor(pages, config, collections)).rejects.toMatchObject({
      code: "duplicate-normalized-directory",
    });
  });

  it("treats index.md and a prefixed 01-index.md the same way (ORDER-PREFIX §11)", async () => {
    await write("docs/02-guides/01-index.md", "# Guides");
    await write("docs/02-guides/config.md", "# Config");
    const config = makeConfig({ title: "Test" });
    const { pages, collections } = await buildPagesForTest(config);

    const navigation = await navFor(pages, config, collections);
    const section = navigation.find((n): n is ResolvedNavContainerNode => n.type === "section");
    expect(section?.href).toBe("/guides/");
    expect(titles(section?.items ?? [])).toEqual(["Guides", "Config"]);
  });

  it("treats prefixes as literal filename text when numericPrefixes is disabled (ORDER-PREFIX §18)", async () => {
    await write("docs/02-b.md", "# B");
    await write("docs/01-a.md", "# A");
    const config = makeConfig({
      title: "Test",
      navigation: { auto: { numericPrefixes: false } },
    });
    const { pages, collections } = await buildPagesForTest(config);

    const navigation = await navFor(pages, config, collections);
    // No order info survives, so siblings fall back to title order.
    expect(titles(navigation)).toEqual(["A", "B"]);
  });

  it("omits a route group from the URL but keeps it as a nav section (ROUTE-GROUPS §3, §4)", async () => {
    await write("docs/(marketing)/about.md", "# About");
    const config = makeConfig({ title: "Test" });
    const { pages, collections } = await buildPagesForTest(config);

    const page = pages.find((p) => p.pageId === "marketing.about");
    expect(page?.route).toBe("/about/");

    const navigation = await navFor(pages, config, collections);
    const section = navigation.find((n): n is ResolvedNavContainerNode => n.type === "section");
    expect(section?.id).toBe("marketing");
    expect(section?.title).toBe("Marketing");
    expect(titles(section?.items ?? [])).toEqual(["About"]);
  });

  it("resolves a route group's own index page to the collection root", async () => {
    await write("docs/(marketing)/index.md", "# Home");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildPagesForTest(config);

    const page = pages.find((p) => p.pageId === "marketing");
    expect(page?.route).toBe("/");
  });

  it("applies category.makit.ts placed inside a route group directory", async () => {
    await write("docs/(marketing)/about.md", "# About");
    await writeCategory("docs/(marketing)", { title: "Marketing Pages", order: 1 });
    const config = makeConfig({ title: "Test" });
    const { pages, collections } = await buildPagesForTest(config);

    const navigation = await navFor(pages, config, collections);
    const section = navigation.find((n): n is ResolvedNavContainerNode => n.type === "section");
    expect(section?.title).toBe("Marketing Pages");
  });

  it("keeps sibling groups distinct in the nav tree while still detecting a real URL collision", async () => {
    await write("docs/(marketing)/index.md", "# Marketing Home");
    await write("docs/(product)/index.md", "# Product Home");
    const config = makeConfig({ title: "Test" });

    // Both groups resolve their index page to the collection root, which is
    // a genuine URL collision (spec §15.3) — route groups don't bypass it.
    await expect(buildPagesForTest(config)).rejects.toThrow(/duplicate-route|Duplicate route/);
  });

  it("keeps sibling groups as separate nav sections", async () => {
    await write("docs/(marketing)/about.md", "# Marketing About");
    await write("docs/(product)/pricing.md", "# Product Pricing");
    const config = makeConfig({ title: "Test" });
    const { pages, collections } = await buildPagesForTest(config);

    expect(pages.map((p) => p.route).sort()).toEqual(["/about/", "/pricing/"]);

    const navigation = await navFor(pages, config, collections);
    const sections = navigation.filter(
      (n): n is ResolvedNavContainerNode => n.type === "section",
    );
    expect(sections.map((s) => s.id).sort()).toEqual(["marketing", "product"]);
  });

  it("treats route groups as literal directory names when routeGroups is disabled", async () => {
    await write("docs/(marketing)/about.md", "# About");
    const config = makeConfig({
      title: "Test",
      navigation: { auto: { routeGroups: false } },
    });
    const { pages } = await buildPagesForTest(config);

    const page = pages.find((p) => p.pageId === "(marketing).about");
    expect(page?.route).toBe("/(marketing)/about/");
  });

  it('omits the group from the URL and the nav tree under routeGroups: "flatten" (ROUTE-GROUPS §9)', async () => {
    await write("docs/(marketing)/about.md", "# About");
    const config = makeConfig({
      title: "Test",
      navigation: { auto: { routeGroups: "flatten" } },
    });
    const { pages, collections } = await buildPagesForTest(config);

    const page = pages.find((p) => p.pageId === "about");
    expect(page?.route).toBe("/about/");

    // No "marketing" section — the page is promoted straight to the top level.
    const navigation = await navFor(pages, config, collections);
    expect(navigation.some((n) => n.type === "section")).toBe(false);
    expect(navigation).toMatchObject([{ type: "page", title: "About", href: "/about/" }]);
  });

  it('flattens a route group nested under an ordinary directory under "flatten" mode', async () => {
    await write("docs/guides/(internal)/setup.md", "# Setup");
    const config = makeConfig({
      title: "Test",
      navigation: { auto: { routeGroups: "flatten" } },
    });
    const { pages, collections } = await buildPagesForTest(config);

    const page = pages.find((p) => p.pageId === "guides.setup");
    expect(page?.route).toBe("/guides/setup/");

    const navigation = await navFor(pages, config, collections);
    const section = navigation.find((n): n is ResolvedNavContainerNode => n.type === "section");
    expect(section?.id).toBe("guides");
    // "setup" sits directly under "guides" — no intermediate "internal" group.
    expect(section?.items.every((n) => n.type !== "group")).toBe(true);
    expect(titles(section?.items ?? [])).toEqual(["Setup"]);
  });

  it('still detects a colliding directory identity between two flattened groups under "flatten" mode', async () => {
    // The pages themselves don't collide (different URLs)...
    await write("docs/(a)/shared/one.md", "# One");
    await write("docs/(b)/shared/two.md", "# Two");
    const config = makeConfig({
      title: "Test",
      navigation: { auto: { routeGroups: "flatten" } },
    });
    const { pages, collections } = await buildPagesForTest(config);
    expect(pages.map((p) => p.route).sort()).toEqual(["/shared/one/", "/shared/two/"]);

    // ...but both directories named "shared" normalize to the same nav
    // dirKey once their (a)/(b) parents are flattened away, which would
    // otherwise silently merge two distinct directories' metadata.
    await expect(navFor(pages, config, collections)).rejects.toThrow(
      /duplicate-normalized-directory|both normalize to/,
    );
  });

  it('ignores category.makit.ts inside a "flatten"-mode route group with a warning', async () => {
    await write("docs/(marketing)/about.md", "# About");
    await writeCategory("docs/(marketing)", { title: "Marketing Pages" });
    const config = makeConfig({
      title: "Test",
      navigation: { auto: { routeGroups: "flatten" } },
    });
    const { pages, collections } = await buildPagesForTest(config);

    const { navigation, diagnostics } = await generateNavigation(
      pages,
      config.i18n.locales[0]!,
      config,
      collections[0]!,
      collections,
      createMetadataJiti(),
    );
    expect(navigation.some((n) => n.type === "section" || n.type === "group")).toBe(false);
    expect(diagnostics.some((d) => d.code === "route-group-category-ignored")).toBe(true);
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
