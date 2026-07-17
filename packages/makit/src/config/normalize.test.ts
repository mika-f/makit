import { describe, expect, it } from "vitest";
import { MakitError } from "../core/errors.js";
import { normalizeBasePath, normalizeLocaleForUrl, resolveConfig } from "./normalize.js";
import type { MakitConfigParsed } from "./schema.js";

const ctx = { root: "/project", configPath: "/project/makit.config.ts" };

describe("normalizeBasePath", () => {
  it("returns the empty string for no basePath", () => {
    expect(normalizeBasePath(undefined)).toBe("");
    expect(normalizeBasePath("")).toBe("");
    expect(normalizeBasePath("/")).toBe("");
  });

  it("adds a leading slash", () => {
    expect(normalizeBasePath("foo")).toBe("/foo");
  });

  it("strips trailing slashes", () => {
    expect(normalizeBasePath("/foo/")).toBe("/foo");
    expect(normalizeBasePath("foo/bar/")).toBe("/foo/bar");
  });
});

describe("normalizeLocaleForUrl", () => {
  it("lowercases BCP-47 tags", () => {
    expect(normalizeLocaleForUrl("ja-JP")).toBe("ja-jp");
    expect(normalizeLocaleForUrl("zh-Hant-TW")).toBe("zh-hant-tw");
  });
});

describe("resolveConfig without i18n", () => {
  it("treats the site as a single implicit locale", () => {
    const parsed: MakitConfigParsed = { title: "My Docs" };
    const resolved = resolveConfig(parsed, ctx);

    expect(resolved.i18n.enabled).toBe(false);
    expect(resolved.i18n.locales).toHaveLength(1);
    expect(resolved.i18n.locales[0]?.locale).toBe("en");
    expect(resolved.i18n.defaultLocale).toBe("en");
  });

  it("uses the top-level lang for the implicit locale", () => {
    const parsed: MakitConfigParsed = { title: "My Docs", lang: "fr" };
    const resolved = resolveConfig(parsed, ctx);
    expect(resolved.i18n.locales[0]?.locale).toBe("fr");
    expect(resolved.lang).toBe("fr");
  });
});

describe("resolveConfig with i18n", () => {
  const base: MakitConfigParsed = {
    title: "My Docs",
    i18n: {
      defaultLocale: "en-US",
      locales: [{ locale: "en-US", label: "English" }, { locale: "ja-JP" }],
    },
  };

  it("normalizes locales to lowercase URL slugs", () => {
    const resolved = resolveConfig(base, ctx);
    expect(resolved.i18n.locales.map((l) => l.urlLocale)).toEqual(["en-us", "ja-jp"]);
  });

  it("derives a per-locale sourceDir under sourceDir", () => {
    const resolved = resolveConfig(base, ctx);
    expect(resolved.i18n.locales[0]?.sourceDir).toBe("docs/en-us");
    expect(resolved.i18n.locales[1]?.sourceDir).toBe("docs/ja-jp");
  });

  it("respects a per-locale sourceDir override", () => {
    const parsed: MakitConfigParsed = {
      title: "My Docs",
      i18n: {
        defaultLocale: "en-US",
        locales: [{ locale: "en-US", sourceDir: "documentation/en" }],
      },
    };
    const resolved = resolveConfig(parsed, ctx);
    expect(resolved.i18n.locales[0]?.sourceDir).toBe("documentation/en");
  });

  it("defaults fallback to enabled + render + showNotice", () => {
    const resolved = resolveConfig(base, ctx);
    expect(resolved.i18n.fallback).toEqual({
      enabled: true,
      behavior: "render",
      showNotice: true,
    });
  });

  it("throws when locales collide after normalization", () => {
    const parsed: MakitConfigParsed = {
      title: "My Docs",
      i18n: {
        defaultLocale: "en-US",
        locales: [{ locale: "en-US" }, { locale: "EN-us" }],
      },
    };
    expect(() => resolveConfig(parsed, ctx)).toThrow(MakitError);
    try {
      resolveConfig(parsed, ctx);
      expect.unreachable();
    } catch (error) {
      expect((error as MakitError).code).toBe("duplicate-locale");
    }
  });

  it("throws when defaultLocale isn't one of the configured locales", () => {
    const parsed: MakitConfigParsed = {
      title: "My Docs",
      i18n: {
        defaultLocale: "fr-FR",
        locales: [{ locale: "en-US" }, { locale: "ja-JP" }],
      },
    };
    try {
      resolveConfig(parsed, ctx);
      expect.unreachable();
    } catch (error) {
      expect((error as MakitError).code).toBe("default-locale-not-found");
    }
  });
});

describe("resolveConfig defaults", () => {
  it("fills in every default value", () => {
    const resolved = resolveConfig({ title: "My Docs" }, ctx);

    expect(resolved.sourceDir).toBe("docs");
    expect(resolved.publicDir).toBe("public");
    expect(resolved.outDir).toBe("dist");
    expect(resolved.basePath).toBe("");
    expect(resolved.seo.titleTemplate).toBe("%s | My Docs");
    expect(resolved.sitemap).toEqual({ enabled: true, includeFallbackPages: false });
    expect(resolved.llms).toEqual({ enabled: false });
    expect(resolved.build).toEqual({ clean: true, trailingSlash: true });
    expect(resolved.dev).toEqual({
      port: 3000,
      host: "localhost",
      open: false,
      silentNext: false,
    });
    expect(resolved.markdown.shiki.themes).toEqual({ light: "github-light", dark: "github-dark" });
    expect(resolved.markdown.externalLinks).toEqual({
      target: "_blank",
      rel: "noopener noreferrer",
    });
    expect(resolved.theme.colorScheme).toBe("system");
    expect(resolved.validation).toEqual({ strict: false, disallowFrontMatter: false, failOn: [] });
  });

  it("honors a single shiki theme override for both light and dark", () => {
    const resolved = resolveConfig(
      { title: "My Docs", markdown: { shiki: { theme: "nord" } } },
      ctx,
    );
    expect(resolved.markdown.shiki.themes).toEqual({ light: "nord", dark: "nord" });
  });

  it("enables LLM-oriented output when configured", () => {
    const resolved = resolveConfig({ title: "My Docs", llms: { enabled: true } }, ctx);

    expect(resolved.llms).toEqual({ enabled: true });
  });

  it("uses a custom titleTemplate when given", () => {
    const resolved = resolveConfig({ title: "My Docs", seo: { titleTemplate: "%s :: Docs" } }, ctx);
    expect(resolved.seo.titleTemplate).toBe("%s :: Docs");
  });

  it("defaults navigation.auto to numericPrefixes enabled and unorderedPosition last (ORDER-PREFIX §18)", () => {
    const resolved = resolveConfig({ title: "My Docs" }, ctx);
    expect(resolved.navigation.auto).toEqual({ numericPrefixes: true, unorderedPosition: "last" });
  });

  it("honors navigation.auto overrides", () => {
    const resolved = resolveConfig(
      {
        title: "My Docs",
        navigation: { auto: { numericPrefixes: false, unorderedPosition: "first" } },
      },
      ctx,
    );
    expect(resolved.navigation.auto).toEqual({
      numericPrefixes: false,
      unorderedPosition: "first",
    });
  });
});
