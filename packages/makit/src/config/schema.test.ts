import { describe, expect, it } from "vitest";
import { makitConfigSchema } from "./schema.js";

describe("makitConfigSchema", () => {
  it("accepts the minimal valid config", () => {
    const result = makitConfigSchema.safeParse({ title: "My Docs" });
    expect(result.success).toBe(true);
  });

  it("rejects a config missing the required title", () => {
    const result = makitConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects unknown top-level keys", () => {
    const result = makitConfigSchema.safeParse({ title: "My Docs", notARealOption: true });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid siteUrl", () => {
    const result = makitConfigSchema.safeParse({ title: "My Docs", siteUrl: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("accepts configured analytics providers and validates their URLs", () => {
    const valid = makitConfigSchema.safeParse({
      title: "My Docs",
      analytics: {
        googleAnalytics: { measurementId: "G-123" },
        googleTagManager: { containerId: "GTM-123" },
        posthog: { apiKey: "phc_123", apiHost: "https://eu.i.posthog.com" },
        umami: { websiteId: "website-123", scriptUrl: "https://stats.example.com/script.js" },
        vercel: {},
        scripts: [
          {
            src: "https://analytics.example.com/script.js",
            strategy: "lazyOnload",
            attributes: { "data-site": "docs", crossOrigin: "anonymous" },
          },
        ],
      },
    });
    const invalid = makitConfigSchema.safeParse({
      title: "My Docs",
      analytics: { posthog: { apiKey: "phc_123", apiHost: "not-a-url" } },
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  it("accepts a GitHub repository name containing dots", () => {
    const result = makitConfigSchema.safeParse({
      title: "My Docs",
      github: { repository: "mika-f/docs.natsuneko.cat" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a GitHub repository with whitespace", () => {
    const result = makitConfigSchema.safeParse({
      title: "My Docs",
      github: { repository: "mika-f/docs natsuneko" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid locale dir value", () => {
    const result = makitConfigSchema.safeParse({
      title: "My Docs",
      i18n: {
        defaultLocale: "en-US",
        locales: [{ locale: "en-US", dir: "sideways" }],
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an i18n block with no locales", () => {
    const result = makitConfigSchema.safeParse({
      title: "My Docs",
      i18n: { defaultLocale: "en-US", locales: [] },
    });
    expect(result.success).toBe(false);
  });

  it("accepts nested manual navigation with recursive items", () => {
    const result = makitConfigSchema.safeParse({
      title: "My Docs",
      navigation: {
        mode: "manual",
        locales: {
          "en-US": [
            {
              title: "Guide",
              items: [
                {
                  title: "Intro",
                  href: "/intro",
                  items: [{ title: "Nested", href: "/intro/nested" }],
                },
              ],
            },
          ],
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts a full example config", () => {
    const result = makitConfigSchema.safeParse({
      title: "Makit Documentation",
      description: "Docs powered by Makit",
      siteUrl: "https://makit.example.com",
      i18n: {
        defaultLocale: "en-US",
        locales: [
          { locale: "en-US", label: "English" },
          { locale: "ja-JP", label: "日本語" },
        ],
        fallback: { enabled: true, behavior: "render", showNotice: true },
      },
      markdown: {
        gfm: true,
        shiki: {
          themes: { light: "github-light", dark: "github-dark" },
          unknownLanguage: "warning",
        },
      },
      validation: { strict: false, failOn: ["duplicate-route", "duplicate-page-id"] },
    });
    expect(result.success).toBe(true);
  });

  it("accepts navigation.auto (ORDER-PREFIX §18)", () => {
    const result = makitConfigSchema.safeParse({
      title: "My Docs",
      navigation: { auto: { numericPrefixes: false, unorderedPosition: "first" } },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid navigation.auto.unorderedPosition", () => {
    const result = makitConfigSchema.safeParse({
      title: "My Docs",
      navigation: { auto: { unorderedPosition: "middle" } },
    });
    expect(result.success).toBe(false);
  });

  it("accepts duplicate-navigation-order in validation.failOn", () => {
    const result = makitConfigSchema.safeParse({
      title: "My Docs",
      validation: { failOn: ["duplicate-navigation-order"] },
    });
    expect(result.success).toBe(true);
  });
});
