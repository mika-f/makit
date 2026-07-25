import { describe, expect, it } from "vitest";
import type { I18nData, LocalePageMap, LocaleRouteMap } from "../data/types.js";
import {
  collectLocaleAliasRoutes,
  localeAliasFallback,
  resolveLocaleAliasTargets,
  type LocaleAliasMaps,
} from "./locale-alias.js";

function i18nData(overrides: Partial<I18nData> = {}): I18nData {
  return {
    enabled: true,
    defaultLocale: "en-US",
    locales: [
      {
        locale: "en-US",
        urlLocale: "en-us",
        label: "English",
        lang: "en",
        dir: "ltr",
        sourceDir: "en-us",
      },
      {
        locale: "ja-JP",
        urlLocale: "ja-jp",
        label: "日本語",
        lang: "ja",
        dir: "ltr",
        sourceDir: "ja-jp",
      },
    ],
    fallback: { enabled: true, behavior: "render", showNotice: true },
    collectionFallback: { behavior: "render" },
    root: { behavior: "detect" },
    localeSwitcher: { missingPage: "fallback" },
    messages: {},
    ...overrides,
  };
}

interface PageSpec {
  urlLocale: string;
  segments: string[];
  draft?: boolean;
}

/** Index maps holding one `docs`-collection page per spec, keyed by its own segments. */
function mapsOf(...pages: PageSpec[]): LocaleAliasMaps {
  const routeMap: Record<string, LocaleRouteMap> = {};
  const pageMap: Record<string, LocalePageMap> = {};
  for (const { urlLocale, segments, draft } of pages) {
    const pageId = segments.join(".") || "index";
    (routeMap[urlLocale] ??= {})[segments.join("/")] = {
      kind: "page",
      collectionId: "docs",
      pageId,
    };
    ((pageMap[urlLocale] ??= {}).docs ??= {})[pageId] = {
      route: `/${urlLocale}/${segments.join("/")}/`,
      segments,
      title: pageId,
      draft: draft ?? false,
      hidden: false,
      isFallback: false,
    };
  }
  return { routeMap, pageMap };
}

describe("resolveLocaleAliasTargets", () => {
  it("offers every locale that has the page, in the site's locale order", () => {
    const targets = resolveLocaleAliasTargets(
      i18nData(),
      mapsOf(
        { urlLocale: "ja-jp", segments: ["getting-started"] },
        { urlLocale: "en-us", segments: ["getting-started"] },
      ),
      ["getting-started"],
    );

    expect(targets.map((target) => target.urlLocale)).toEqual(["en-us", "ja-jp"]);
    expect(targets.map((target) => target.href)).toEqual([
      "/en-us/getting-started/",
      "/ja-jp/getting-started/",
    ]);
  });

  it("omits a locale that does not have the page", () => {
    const targets = resolveLocaleAliasTargets(
      i18nData(),
      mapsOf({ urlLocale: "en-us", segments: ["guides", "intro"] }),
      ["guides", "intro"],
    );

    expect(targets.map((target) => target.locale)).toEqual(["en-US"]);
  });

  it("omits a draft page, which has no production route", () => {
    const targets = resolveLocaleAliasTargets(
      i18nData(),
      mapsOf({ urlLocale: "en-us", segments: ["wip"], draft: true }),
      ["wip"],
    );

    expect(targets).toEqual([]);
  });

  it("resolves a portal home route straight from the route map", () => {
    const targets = resolveLocaleAliasTargets(
      i18nData(),
      { routeMap: { "en-us": { portal: { kind: "portal", route: "/en-us/portal/" } } }, pageMap: {} },
      ["portal"],
    );

    expect(targets[0]?.href).toBe("/en-us/portal/");
  });

  it("never treats `/` as locale-less — the root gateway owns it", () => {
    const targets = resolveLocaleAliasTargets(
      i18nData(),
      mapsOf({ urlLocale: "en-us", segments: [] }),
      [],
    );

    expect(targets).toEqual([]);
  });

  it("never shadows a path that already starts with a locale prefix", () => {
    // `/en-us/missing` is a miss inside a real locale: a genuine 404, even
    // though `ja-jp` happens to hold a page at the segments `en-us/missing`.
    const targets = resolveLocaleAliasTargets(
      i18nData(),
      mapsOf({ urlLocale: "ja-jp", segments: ["en-us", "missing"] }),
      ["en-us", "missing"],
    );

    expect(targets).toEqual([]);
  });

  it("resolves nothing when i18n is disabled", () => {
    const targets = resolveLocaleAliasTargets(
      i18nData({ enabled: false }),
      mapsOf({ urlLocale: "en-us", segments: ["getting-started"] }),
      ["getting-started"],
    );

    expect(targets).toEqual([]);
  });
});

describe("collectLocaleAliasRoutes", () => {
  it("unions every locale's routes, deduplicated and without the root", () => {
    const indexes = mapsOf(
      { urlLocale: "en-us", segments: ["getting-started"] },
      { urlLocale: "ja-jp", segments: ["getting-started"] },
      { urlLocale: "ja-jp", segments: ["guides", "intro"] },
    );
    indexes.routeMap["en-us"]![""] = { kind: "portal", route: "/en-us/" };

    expect(collectLocaleAliasRoutes(i18nData(), indexes)).toEqual([
      ["getting-started"],
      ["guides", "intro"],
    ]);
  });

  it("skips routes no locale can serve", () => {
    const routes = collectLocaleAliasRoutes(
      i18nData(),
      mapsOf({ urlLocale: "en-us", segments: ["wip"], draft: true }),
    );

    expect(routes).toEqual([]);
  });

  it("collects nothing when i18n is disabled", () => {
    const routes = collectLocaleAliasRoutes(
      i18nData({ enabled: false }),
      mapsOf({ urlLocale: "en-us", segments: ["getting-started"] }),
    );

    expect(routes).toEqual([]);
  });
});

describe("localeAliasFallback", () => {
  const targets = [{ locale: "en-US" }, { locale: "ja-JP" }];

  it("picks the default locale", () => {
    expect(localeAliasFallback(i18nData(), targets)?.locale).toBe("en-US");
  });

  it("lets `root.locale` override the default locale", () => {
    const i18n = i18nData({ root: { behavior: "default", locale: "ja-JP" } });

    expect(localeAliasFallback(i18n, targets)?.locale).toBe("ja-JP");
  });

  it("falls back to the first available target when neither is present", () => {
    expect(localeAliasFallback(i18nData(), [{ locale: "ja-JP" }])?.locale).toBe("ja-JP");
  });
});
