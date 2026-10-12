import { describe, expect, it } from "vitest";
import type { GeneratedStaticPage, LocaleData } from "../data/types.js";
import { resolveStaticPageLocaleLinks } from "./static-page-locale-links.js";

function locale(urlLocale: string, tag: string): LocaleData {
  return { locale: tag, urlLocale, label: tag, lang: tag, dir: "ltr", sourceDir: urlLocale };
}

const EN = locale("en-us", "en-US");
const JA = locale("ja-jp", "ja-JP");
const FR = locale("fr-fr", "fr-FR");

const page: GeneratedStaticPage = {
  id: "pricing",
  route: "/en-us/pricing/",
  segments: ["pricing"],
  locale: "en-us",
  sourcePath: "/p/pages/pricing.tsx",
  kind: "component",
  componentKey: "pricing",
  title: "Pricing",
  layout: "default",
  search: false,
  draft: false,
  metadata: {
    noindex: false,
    nofollow: false,
    alternates: [
      { urlLocale: "ja-jp", hreflang: "ja-JP", href: "/ja-jp/pricing/" },
      { urlLocale: "x-default", hreflang: "x-default", href: "/en-us/pricing/" },
    ],
  },
};

describe("resolveStaticPageLocaleLinks (STATIC-PAGES §10.2)", () => {
  it("links the same static page in each locale that has it", () => {
    const links = resolveStaticPageLocaleLinks(page, [EN, JA], {});

    expect(links).toEqual([
      { locale: EN, href: "/en-us/pricing/", current: true },
      { locale: JA, href: "/ja-jp/pricing/", current: false },
    ]);
  });

  it("falls back to a locale's home when the page has no version there", () => {
    const links = resolveStaticPageLocaleLinks(page, [EN, JA, FR], { "fr-fr": "/fr-fr/" });

    expect(links.map((link) => link.href)).toEqual([
      "/en-us/pricing/",
      "/ja-jp/pricing/",
      "/fr-fr/",
    ]);
  });

  it("omits a locale with neither a version nor a home", () => {
    const links = resolveStaticPageLocaleLinks(page, [EN, JA, FR], {});

    expect(links.map((link) => link.locale.urlLocale)).toEqual(["en-us", "ja-jp"]);
  });

  it("returns nothing when there is no other locale to switch to", () => {
    const solo = { ...page, metadata: { ...page.metadata, alternates: [] } };
    expect(resolveStaticPageLocaleLinks(solo, [EN, FR], {})).toEqual([]);
  });
});
