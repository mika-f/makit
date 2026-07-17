import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import type { PageMetadata } from "../metadata/types.js";
import { buildPagesForTest, pageMetaSource } from "../testing/fixtures.js";
import type { MakitConfigParsed } from "../config/schema.js";
import { generateFallbackPages, groupPagesByPageId, populateAlternates } from "./i18n.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "makit-i18n-"));
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

function i18nConfig(overrides: Partial<MakitConfigParsed> = {}) {
  const { i18n: i18nOverrides, ...rest } = overrides;
  return resolveConfig(
    {
      title: "Test",
      ...rest,
      i18n: {
        defaultLocale: "en-US",
        locales: [{ locale: "en-US" }, { locale: "ja-JP" }],
        ...i18nOverrides,
      },
    },
    { root: dir, configPath: join(dir, "makit.config.ts") },
  );
}

describe("groupPagesByPageId", () => {
  it("groups pages with the same pageId across locales", async () => {
    await write("docs/en-us/index.md", "# Home");
    await write("docs/ja-jp/index.md", "# ホーム");
    const config = i18nConfig();
    const { pages } = await buildPagesForTest(config);

    const groups = groupPagesByPageId(pages);
    expect(groups.size).toBe(1);
    const group = groups.get("default:index")!;
    expect(group.byLocale.get("en-us")?.locale).toBe("en-us");
    expect(group.byLocale.get("ja-jp")?.locale).toBe("ja-jp");
  });

  it("matches translations by explicit .meta.ts id even with different filenames", async () => {
    await write("docs/en-us/deployment.md", "# Deploy");
    await writeMeta("docs/en-us/deployment.md", { id: "deploy" });
    await write("docs/ja-jp/config.md", "# 設定");
    await writeMeta("docs/ja-jp/config.md", { id: "deploy", slug: "settings" });
    const config = i18nConfig();
    const { pages } = await buildPagesForTest(config);

    const groups = groupPagesByPageId(pages);
    expect(groups.size).toBe(1);
    expect(groups.get("default:deploy")?.byLocale.size).toBe(2);
  });

  it("pairs pages by auto pageId even with differing numeric prefixes across locales (ORDER-PREFIX §6, §14)", async () => {
    await write("docs/en-us/01-getting-started.md", "# Getting Started");
    await write("docs/ja-jp/03-getting-started.md", "# はじめに");
    const config = i18nConfig();
    const { pages } = await buildPagesForTest(config);

    const groups = groupPagesByPageId(pages);
    expect(groups.size).toBe(1);
    const group = groups.get("default:getting-started")!;
    expect(group.byLocale.get("en-us")?.locale).toBe("en-us");
    expect(group.byLocale.get("ja-jp")?.locale).toBe("ja-jp");
  });
});

describe("generateFallbackPages", () => {
  it("generates a render-behavior fallback page for missing translations", async () => {
    await write("docs/en-us/guides/deployment.md", "# Deployment Guide");
    const config = i18nConfig();
    const { pages } = await buildPagesForTest(config);

    const fallbackPages = generateFallbackPages(pages, config);
    expect(fallbackPages).toHaveLength(1);

    const fallback = fallbackPages[0]!;
    expect(fallback.route).toBe("/ja-jp/guides/deployment/");
    expect(fallback.locale).toBe("ja-jp");
    expect(fallback.contentLocale).toBe("en-us");
    expect(fallback.isFallback).toBe(true);
    expect(fallback.fallbackSource).toBe("/en-us/guides/deployment/");
    expect(fallback.html).toContain("Deployment Guide");
    expect(fallback.metadata.canonical).toBe("/en-us/guides/deployment/");
  });

  it("does not generate a fallback when a real translation already exists", async () => {
    await write("docs/en-us/index.md", "# Home EN");
    await write("docs/ja-jp/index.md", "# Home JA");
    const config = i18nConfig();
    const { pages } = await buildPagesForTest(config);

    expect(generateFallbackPages(pages, config)).toHaveLength(0);
  });

  it("generates a minimal placeholder body for redirect behavior", async () => {
    await write("docs/en-us/guides/deployment.md", "# Deployment Guide");
    const config = i18nConfig({ i18n: { fallback: { behavior: "redirect" } } as never });
    const { pages } = await buildPagesForTest(config);

    const fallbackPages = generateFallbackPages(pages, config);
    expect(fallbackPages[0]?.html).not.toContain("Deployment Guide");
    expect(fallbackPages[0]?.html).toContain("/en-us/guides/deployment/");
  });

  it("generates nothing for not-found behavior", async () => {
    await write("docs/en-us/guides/deployment.md", "# Deployment Guide");
    const config = i18nConfig({ i18n: { fallback: { behavior: "not-found" } } as never });
    const { pages } = await buildPagesForTest(config);

    expect(generateFallbackPages(pages, config)).toHaveLength(0);
  });

  it("generates nothing when fallback is disabled", async () => {
    await write("docs/en-us/guides/deployment.md", "# Deployment Guide");
    const config = i18nConfig({ i18n: { fallback: false } as never });
    const { pages } = await buildPagesForTest(config);

    expect(generateFallbackPages(pages, config)).toHaveLength(0);
  });

  it("generates nothing when i18n is disabled", async () => {
    await write("docs/index.md", "# Home");
    const config = resolveConfig(
      { title: "Test" },
      { root: dir, configPath: join(dir, "makit.config.ts") },
    );
    const { pages } = await buildPagesForTest(config);

    expect(generateFallbackPages(pages, config)).toHaveLength(0);
  });

  it("generates nothing when there is no default-locale content to fall back to", async () => {
    await write("docs/ja-jp/only-here.md", "# Only in Japanese");
    const config = i18nConfig();
    const { pages } = await buildPagesForTest(config);

    expect(generateFallbackPages(pages, config)).toHaveLength(0);
  });
});

describe("populateAlternates", () => {
  it("cross-references real translations and adds an x-default entry", async () => {
    await write("docs/en-us/index.md", "# Home EN");
    await write("docs/ja-jp/index.md", "# Home JA");
    const config = i18nConfig();
    const { pages } = await buildPagesForTest(config);

    const withAlternates = populateAlternates(pages, config);
    const enPage = withAlternates.find((p) => p.locale === "en-us")!;
    const jaPage = withAlternates.find((p) => p.locale === "ja-jp")!;

    expect(enPage.metadata.alternates).toEqual([
      { urlLocale: "ja-jp", hreflang: "ja-JP", href: "/ja-jp/" },
      { urlLocale: "x-default", hreflang: "x-default", href: "/en-us/" },
    ]);
    expect(jaPage.metadata.alternates).toEqual([
      { urlLocale: "en-us", hreflang: "en-US", href: "/en-us/" },
      { urlLocale: "x-default", hreflang: "x-default", href: "/en-us/" },
    ]);
  });

  it("leaves fallback pages with no alternates", async () => {
    await write("docs/en-us/guides/deployment.md", "# Deployment Guide");
    const config = i18nConfig();
    const { pages } = await buildPagesForTest(config);
    const fallbackPages = generateFallbackPages(pages, config);

    const withAlternates = populateAlternates([...pages, ...fallbackPages], config);
    const fallback = withAlternates.find((p) => p.isFallback)!;
    expect(fallback.metadata.alternates).toEqual([]);
  });

  it("is a no-op when i18n is disabled", async () => {
    await write("docs/index.md", "# Home");
    const config = resolveConfig(
      { title: "Test" },
      { root: dir, configPath: join(dir, "makit.config.ts") },
    );
    const { pages } = await buildPagesForTest(config);

    const withAlternates = populateAlternates(pages, config);
    expect(withAlternates[0]?.metadata.alternates).toEqual([]);
  });

  it("does not add alternates for a page with no translations at all", async () => {
    await write("docs/en-us/only-here.md", "# Only Here");
    const config = i18nConfig();
    const { pages } = await buildPagesForTest(config);

    const withAlternates = populateAlternates(pages, config);
    expect(withAlternates[0]?.metadata.alternates).toEqual([]);
  });
});
