import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import type { MakitConfigParsed } from "../config/schema.js";
import { generateFallbackPages } from "./i18n.js";
import { generateNavigation } from "./navigation.js";
import { buildAllPages } from "./pages.js";

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

function makeConfig(overrides: MakitConfigParsed) {
  return resolveConfig(overrides, { root: dir, configPath: join(dir, "makit.config.ts") });
}

describe("generateNavigation (auto mode)", () => {
  it("builds a flat ungrouped list for top-level pages", async () => {
    await write("docs/index.md", "# Home");
    await write("docs/getting-started.md", "# Getting Started");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    const { navigation } = generateNavigation(pages, config.i18n.locales[0]!, config);
    expect(navigation).toHaveLength(1);
    expect(navigation[0]?.title).toBeUndefined();
    expect(navigation[0]?.items.map((i) => i.title)).toEqual(["Home", "Getting Started"]);
  });

  it("turns a subdirectory into a group, with its index page as the first item", async () => {
    await write("docs/guides/index.md", "---\ntitle: Guides Overview\n---\n# Guides");
    await write("docs/guides/configuration.md", "# Configuration");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    const { navigation } = generateNavigation(pages, config.i18n.locales[0]!, config);
    const guidesGroup = navigation.find((g) => g.title === "Guides Overview");
    expect(guidesGroup).toBeDefined();
    expect(guidesGroup?.items.map((i) => i.title)).toEqual(["Guides Overview", "Configuration"]);
    expect(guidesGroup?.items[0]?.href).toBe("/guides/");
  });

  it("humanizes the directory name when there is no index page", async () => {
    await write("docs/guides/configuration.md", "# Configuration");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    const { navigation } = generateNavigation(pages, config.i18n.locales[0]!, config);
    expect(navigation.find((g) => g.title === "Guides")).toBeDefined();
  });

  it("sorts siblings by order, then by title", async () => {
    await write("docs/b.md", "---\norder: 1\n---\n# B");
    await write("docs/a.md", "---\norder: 2\n---\n# A");
    await write("docs/c.md", "# C");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    const { navigation } = generateNavigation(pages, config.i18n.locales[0]!, config);
    expect(navigation[0]?.items.map((i) => i.title)).toEqual(["B", "A", "C"]);
  });

  it("excludes hidden pages", async () => {
    await write("docs/index.md", "# Home");
    await write("docs/secret.md", "---\nhidden: true\n---\n# Secret");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    const { navigation } = generateNavigation(pages, config.i18n.locales[0]!, config);
    expect(navigation[0]?.items.map((i) => i.title)).toEqual(["Home"]);
  });

  it("uses navigation.title as a label override", async () => {
    await write(
      "docs/getting-started.md",
      "---\ntitle: Getting Started\nnavigation:\n  title: Start Here\n---\n# Getting Started",
    );
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    const { navigation } = generateNavigation(pages, config.i18n.locales[0]!, config);
    expect(navigation[0]?.items[0]?.title).toBe("Start Here");
  });

  it("pulls a page into a named group via navigation.group", async () => {
    await write("docs/faq.md", "---\ntitle: FAQ\nnavigation:\n  group: Support\n---\n# FAQ");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    const { navigation } = generateNavigation(pages, config.i18n.locales[0]!, config);
    const supportGroup = navigation.find((g) => g.title === "Support");
    expect(supportGroup?.items.map((i) => i.title)).toEqual(["FAQ"]);
    expect(
      navigation.some((g) => g.items.some((i) => i.title === "FAQ" && g.title !== "Support")),
    ).toBe(false);
  });

  it("excludes fallback pages when includeFallbackPages is false", async () => {
    await write("docs/en-us/guides/deployment.md", "# Deployment Guide");
    const config = makeConfig({
      title: "Test",
      i18n: { defaultLocale: "en-US", locales: [{ locale: "en-US" }, { locale: "ja-JP" }] },
      navigation: { includeFallbackPages: false },
    });
    const { pages } = await buildAllPages(config);
    const fallbackPages = generateFallbackPages(pages, config);
    const allPages = [...pages, ...fallbackPages];

    const jaLocale = config.i18n.locales.find((l) => l.urlLocale === "ja-jp")!;
    const { navigation } = generateNavigation(allPages, jaLocale, config);
    expect(navigation).toHaveLength(0);
  });

  it("includes fallback pages when includeFallbackPages is true (the default)", async () => {
    await write("docs/en-us/guides/deployment.md", "# Deployment Guide");
    const config = makeConfig({
      title: "Test",
      i18n: { defaultLocale: "en-US", locales: [{ locale: "en-US" }, { locale: "ja-JP" }] },
    });
    const { pages } = await buildAllPages(config);
    const fallbackPages = generateFallbackPages(pages, config);
    const allPages = [...pages, ...fallbackPages];

    const jaLocale = config.i18n.locales.find((l) => l.urlLocale === "ja-jp")!;
    const { navigation } = generateNavigation(allPages, jaLocale, config);
    expect(navigation.length).toBeGreaterThan(0);
  });
});

describe("generateNavigation (manual mode)", () => {
  it("passes through the configured groups for the current locale", async () => {
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
    const { pages } = await buildAllPages(config);

    const { navigation, warnings } = generateNavigation(pages, config.i18n.locales[0]!, config);
    expect(navigation).toEqual([
      { title: "Guide", items: [{ title: "Getting Started", href: "/getting-started" }] },
    ]);
    expect(warnings).toHaveLength(0);
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
    const { pages } = await buildAllPages(config);

    const { warnings } = generateNavigation(pages, config.i18n.locales[0]!, config);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("/does-not-exist");
  });
});
