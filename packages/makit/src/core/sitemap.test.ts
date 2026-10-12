import { describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import type { GeneratedStaticPage } from "../types/static-page.js";
import { generateSitemapXml } from "./sitemap.js";

const config = resolveConfig(
  { title: "Site", siteUrl: "https://example.com" },
  { root: "/project", configPath: "/project/makit.config.ts" },
);

function staticPage(overrides: Partial<GeneratedStaticPage>): GeneratedStaticPage {
  return {
    id: "pricing",
    route: "/pricing/",
    segments: ["pricing"],
    locale: "en",
    sourcePath: "/project/pages/pricing.tsx",
    kind: "component",
    componentKey: "pricing",
    title: "Pricing",
    layout: "default",
    search: false,
    draft: false,
    metadata: { noindex: false, nofollow: false, alternates: [] },
    ...overrides,
  };
}

describe("generateSitemapXml static pages (STATIC-PAGES §12.5)", () => {
  it("lists static pages with their alternates", () => {
    const xml = generateSitemapXml([], config, [
      staticPage({
        metadata: {
          noindex: false,
          nofollow: false,
          alternates: [{ urlLocale: "ja-jp", hreflang: "ja-JP", href: "/ja-jp/pricing/" }],
        },
      }),
    ]);

    expect(xml).toContain("<loc>https://example.com/pricing/</loc>");
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="ja-JP" href="https://example.com/ja-jp/pricing/" />',
    );
  });

  it("leaves out noindex and draft static pages", () => {
    const xml = generateSitemapXml([], config, [
      staticPage({
        id: "a",
        route: "/a/",
        metadata: { noindex: true, nofollow: false, alternates: [] },
      }),
      staticPage({ id: "b", route: "/b/", draft: true }),
    ]);

    expect(xml).not.toContain("/a/");
    expect(xml).not.toContain("/b/");
  });
});
