import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import type { MakitConfigParsed } from "../config/schema.js";
import { buildAllPages } from "./pages.js";
import {
  validateFallbackRatio,
  validateImages,
  validateInternalLinks,
  validateNavigationCoverage,
  validateSeo,
  validateTitles,
  validateTranslationCoverage,
} from "./validation.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "makit-validation-"));
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

describe("validateInternalLinks", () => {
  it("flags a link to a route that does not exist", async () => {
    await write("docs/index.md", "[broken](./missing.md)");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    const diagnostics = validateInternalLinks(pages);
    expect(
      diagnostics.some((d) => d.code === "broken-link" && d.message.includes("/missing/")),
    ).toBe(true);
  });

  it("does not flag a link to a page that exists", async () => {
    await write("docs/index.md", "[ok](./other.md)");
    await write("docs/other.md", "# Other");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    expect(validateInternalLinks(pages)).toHaveLength(0);
  });

  it("flags a same-page anchor that does not exist", async () => {
    await write("docs/index.md", "# Home\n\n[jump](#does-not-exist)");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    const diagnostics = validateInternalLinks(pages);
    expect(diagnostics.some((d) => d.code === "missing-anchor")).toBe(true);
  });

  it("does not flag a same-page anchor that exists", async () => {
    await write("docs/index.md", "# Home\n\n## Section\n\n[jump](#section)");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    expect(validateInternalLinks(pages)).toHaveLength(0);
  });

  it("flags a link to another page's missing anchor", async () => {
    await write("docs/index.md", "[jump](./other.md#missing)");
    await write("docs/other.md", "# Other");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    const diagnostics = validateInternalLinks(pages);
    expect(diagnostics.some((d) => d.code === "missing-anchor")).toBe(true);
  });

  it("flags a production page linking to a draft page", async () => {
    await write("docs/index.md", "[draft](./secret.md)");
    await write("docs/secret.md", "---\ndraft: true\n---\n# Secret");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    const diagnostics = validateInternalLinks(pages);
    expect(diagnostics.some((d) => d.code === "broken-link" && d.message.includes("draft"))).toBe(
      true,
    );
  });

  it("flags a syntactically invalid external URL", async () => {
    await write("docs/index.md", '<a href="http://">bad</a>\n\nplain text');
    const config = makeConfig({ title: "Test", markdown: { allowDangerousHtml: true } });
    const { pages } = await buildAllPages(config);

    const diagnostics = validateInternalLinks(pages);
    expect(diagnostics.some((d) => d.code === "broken-link" && d.message.includes("http://"))).toBe(
      true,
    );
  });

  it("does not flag a valid external URL", async () => {
    await write("docs/index.md", "[ok](https://example.com)");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    expect(validateInternalLinks(pages)).toHaveLength(0);
  });
});

describe("validateImages", () => {
  it("flags a missing local image", async () => {
    await write("docs/index.md", "![missing](/does-not-exist.png)");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    const diagnostics = validateImages(pages, config);
    expect(diagnostics.some((d) => d.code === "broken-link")).toBe(true);
  });

  it("does not flag an image that exists in publicDir", async () => {
    await write("docs/index.md", "![ok](/logo.png)");
    await write("public/logo.png", "fake-binary-content");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    expect(validateImages(pages, config)).toHaveLength(0);
  });

  it("does not flag an external image URL", async () => {
    await write("docs/index.md", "![ok](https://example.com/logo.png)");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    expect(validateImages(pages, config)).toHaveLength(0);
  });
});

describe("validateTitles", () => {
  it("flags a page with no front matter title or H1", async () => {
    await write("docs/getting-started.md", "Just a paragraph.");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    expect(validateTitles(pages).some((d) => d.code === "missing-title")).toBe(true);
  });

  it("does not flag a page with a front matter title", async () => {
    await write("docs/index.md", "---\ntitle: Home\n---\ncontent");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    expect(validateTitles(pages)).toHaveLength(0);
  });

  it("does not flag a page with an H1", async () => {
    await write("docs/index.md", "# Home\n\ncontent");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    expect(validateTitles(pages)).toHaveLength(0);
  });
});

describe("validateSeo", () => {
  it("flags a missing siteUrl", async () => {
    await write("docs/index.md", "# Home");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    expect(validateSeo(pages, config).some((d) => d.code === "missing-site-url")).toBe(true);
  });

  it("flags a page with no OGP image and no default image", async () => {
    await write("docs/index.md", "# Home");
    const config = makeConfig({ title: "Test", siteUrl: "https://example.com" });
    const { pages } = await buildAllPages(config);

    expect(validateSeo(pages, config).some((d) => d.code === "missing-og-image")).toBe(true);
  });

  it("does not flag missing OGP image when seo.defaultImage is set", async () => {
    await write("docs/index.md", "# Home");
    const config = makeConfig({
      title: "Test",
      siteUrl: "https://example.com",
      seo: { defaultImage: "/og.png" },
    });
    const { pages } = await buildAllPages(config);

    expect(validateSeo(pages, config).some((d) => d.code === "missing-og-image")).toBe(false);
  });
});

describe("validateNavigationCoverage", () => {
  it("flags a page not reachable from its locale's navigation", async () => {
    await write("docs/index.md", "# Home");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    const diagnostics = validateNavigationCoverage(pages, { en: [] });
    expect(diagnostics.some((d) => d.code === "page-not-in-navigation")).toBe(true);
  });

  it("does not flag a page that is reachable", async () => {
    await write("docs/index.md", "# Home");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    const diagnostics = validateNavigationCoverage(pages, {
      en: [{ items: [{ title: "Home", href: "/" }] }],
    });
    expect(diagnostics).toHaveLength(0);
  });
});

describe("validateTranslationCoverage", () => {
  it("flags default-locale-only pages", async () => {
    await write("docs/en-us/only-here.md", "# Only Here");
    const config = makeConfig({
      title: "Test",
      i18n: { defaultLocale: "en-US", locales: [{ locale: "en-US" }, { locale: "ja-JP" }] },
    });
    const { pages } = await buildAllPages(config);

    expect(
      validateTranslationCoverage(pages, config).some((d) => d.code === "default-locale-only-page"),
    ).toBe(true);
  });

  it("flags translation-only pages missing from the default locale", async () => {
    await write("docs/ja-jp/only-here.md", "# Only Here");
    const config = makeConfig({
      title: "Test",
      i18n: { defaultLocale: "en-US", locales: [{ locale: "en-US" }, { locale: "ja-JP" }] },
    });
    const { pages } = await buildAllPages(config);

    expect(
      validateTranslationCoverage(pages, config).some((d) => d.code === "translation-only-page"),
    ).toBe(true);
  });

  it("is a no-op when i18n is disabled", async () => {
    await write("docs/index.md", "# Home");
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    expect(validateTranslationCoverage(pages, config)).toHaveLength(0);
  });
});

describe("validateFallbackRatio", () => {
  it("warns when more than half of a locale's pages are fallbacks", async () => {
    await write("docs/en-us/a.md", "# A");
    await write("docs/en-us/b.md", "# B");
    await write("docs/en-us/c.md", "# C");
    const config = makeConfig({
      title: "Test",
      i18n: { defaultLocale: "en-US", locales: [{ locale: "en-US" }, { locale: "ja-JP" }] },
    });
    const { pages } = await buildAllPages(config);

    // Simulate 2 real + 2 fallback-like pages for ja-jp (fallback flag set manually for the test).
    const allPages = [
      ...pages,
      { ...pages[0]!, locale: "ja-jp", isFallback: true },
      { ...pages[1]!, locale: "ja-jp", isFallback: true },
    ];

    expect(
      validateFallbackRatio(allPages, config).some((d) => d.code === "too-many-fallback-pages"),
    ).toBe(true);
  });
});
