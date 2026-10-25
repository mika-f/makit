import { describe, expect, it } from "vitest";
import type { GeneratedStaticPage, SiteData } from "../data/types.js";
import { buildSiteMetadata, buildStaticPageMetadata } from "./build-metadata.js";

const site = {
  title: "Site",
  description: "Site description",
  basePath: "",
  seo: { titleTemplate: "%s | Site", defaultImage: "/default.png" },
} as SiteData;

function staticPage(overrides: Partial<GeneratedStaticPage> = {}): GeneratedStaticPage {
  return {
    id: "pricing",
    route: "/en-us/pricing/",
    segments: ["pricing"],
    locale: "en-us",
    kind: "component",
    componentKey: "pricing",
    title: "Pricing",
    layout: "default",
    search: false,
    draft: false,
    metadata: {
      noindex: false,
      nofollow: false,
      alternates: [{ urlLocale: "ja-jp", hreflang: "ja-JP", href: "/ja-jp/pricing/" }],
    },
    ...overrides,
  };
}

describe("buildStaticPageMetadata (STATIC-PAGES §12.3)", () => {
  it("applies the title template and falls back to the site description and image", () => {
    const metadata = buildStaticPageMetadata(staticPage(), site);

    // Absolute, so the root layout's title template isn't applied a second time.
    expect(metadata.title).toEqual({ absolute: "Pricing | Site" });
    expect(metadata.description).toBe("Site description");
    expect(metadata.openGraph?.images).toEqual([{ url: "/default.png" }]);
  });

  it("prefers the page's own description and image", () => {
    const metadata = buildStaticPageMetadata(
      staticPage({
        description: "Plans",
        metadata: { noindex: false, nofollow: false, image: "/og.png", alternates: [] },
      }),
      site,
    );

    expect(metadata.description).toBe("Plans");
    expect(metadata.openGraph?.images).toEqual([{ url: "/og.png" }]);
  });

  it("maps noindex and nofollow to robots", () => {
    const metadata = buildStaticPageMetadata(
      staticPage({ metadata: { noindex: true, nofollow: true, alternates: [] } }),
      site,
    );

    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("lists alternates and itself as hreflang languages", () => {
    const metadata = buildStaticPageMetadata(staticPage(), site);

    expect(metadata.alternates?.canonical).toBe("/en-us/pricing/");
    expect(metadata.alternates?.languages).toEqual({
      "ja-JP": "/ja-jp/pricing/",
      "en-us": "/en-us/pricing/",
    });
  });

  it("honors a canonical override", () => {
    const metadata = buildStaticPageMetadata(
      staticPage({
        metadata: { noindex: false, nofollow: false, canonical: "/pricing/", alternates: [] },
      }),
      site,
    );

    expect(metadata.alternates?.canonical).toBe("/pricing/");
  });
});

describe("buildSiteMetadata", () => {
  it("resolves relative metadata URLs against siteUrl", () => {
    const metadata = buildSiteMetadata({ ...site, siteUrl: "https://docs.example.com" });

    expect(metadata.metadataBase).toEqual(new URL("https://docs.example.com"));
    expect(metadata.title).toEqual({ default: "Site", template: "%s | Site" });
  });

  it("leaves metadataBase unset without a siteUrl", () => {
    expect(buildSiteMetadata(site).metadataBase).toBeUndefined();
  });
});
