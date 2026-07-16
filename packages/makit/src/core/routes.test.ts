import { describe, expect, it } from "vitest";
import { MakitError } from "./errors.js";
import {
  buildRoute,
  derivePageId,
  detectDuplicatePageIds,
  detectDuplicateRoutes,
  filePathToSegments,
  resolveSlugSegments,
} from "./routes.js";

describe("filePathToSegments", () => {
  it("converts a plain file path", () => {
    expect(filePathToSegments("getting-started.md")).toEqual(["getting-started"]);
  });

  it("converts a nested file path", () => {
    expect(filePathToSegments("guides/configuration.md")).toEqual(["guides", "configuration"]);
  });

  it("drops trailing index segments", () => {
    expect(filePathToSegments("index.md")).toEqual([]);
    expect(filePathToSegments("guides/index.md")).toEqual(["guides"]);
  });

  it("supports .markdown extension", () => {
    expect(filePathToSegments("guides/configuration.markdown")).toEqual([
      "guides",
      "configuration",
    ]);
  });
});

describe("resolveSlugSegments", () => {
  it("falls back when no slug is given", () => {
    expect(resolveSlugSegments(undefined, ["a", "b"])).toEqual(["a", "b"]);
  });

  it("wraps a string slug in an array", () => {
    expect(resolveSlugSegments("custom-slug", ["a"])).toEqual(["custom-slug"]);
  });

  it("uses an array slug as-is", () => {
    expect(resolveSlugSegments(["guides", "config"], ["a"])).toEqual(["guides", "config"]);
  });
});

describe("buildRoute", () => {
  it("builds the root route", () => {
    expect(buildRoute([], { basePath: "", trailingSlash: true })).toBe("/");
  });

  it("builds a nested route with a trailing slash", () => {
    expect(buildRoute(["guides", "configuration"], { basePath: "", trailingSlash: true })).toBe(
      "/guides/configuration/",
    );
  });

  it("omits the trailing slash when disabled", () => {
    expect(buildRoute(["guides"], { basePath: "", trailingSlash: false })).toBe("/guides");
  });

  it("adds a locale prefix", () => {
    expect(
      buildRoute(["getting-started"], { basePath: "", localePrefix: "ja-jp", trailingSlash: true }),
    ).toBe("/ja-jp/getting-started/");
  });

  it("prepends basePath", () => {
    expect(buildRoute(["guides"], { basePath: "/docs", trailingSlash: true })).toBe(
      "/docs/guides/",
    );
  });

  it("prepends basePath to the root route", () => {
    expect(buildRoute([], { basePath: "/docs", trailingSlash: true })).toBe("/docs/");
  });
});

describe("derivePageId", () => {
  it("uses the front matter id when given", () => {
    expect(derivePageId("custom-id", ["guides", "configuration"])).toBe("custom-id");
  });

  it("falls back to joined segments", () => {
    expect(derivePageId(undefined, ["guides", "configuration"])).toBe("guides/configuration");
  });

  it("falls back to 'index' for the root page", () => {
    expect(derivePageId(undefined, [])).toBe("index");
  });
});

describe("detectDuplicateRoutes", () => {
  it("passes when all routes are unique", () => {
    expect(() =>
      detectDuplicateRoutes([
        { route: "/a/", locale: "en", sourcePath: "a.md" },
        { route: "/b/", locale: "en", sourcePath: "b.md" },
      ]),
    ).not.toThrow();
  });

  it("allows the same route across different locales", () => {
    expect(() =>
      detectDuplicateRoutes([
        { route: "/en/a/", locale: "en", sourcePath: "en/a.md" },
        { route: "/ja/a/", locale: "ja", sourcePath: "ja/a.md" },
      ]),
    ).not.toThrow();
  });

  it("throws MakitError('duplicate-route') on collision within a locale", () => {
    try {
      detectDuplicateRoutes([
        { route: "/guides/", locale: "en", sourcePath: "guides.md" },
        { route: "/guides/", locale: "en", sourcePath: "guides/index.md" },
      ]);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(MakitError);
      expect((error as MakitError).code).toBe("duplicate-route");
    }
  });
});

describe("detectDuplicatePageIds", () => {
  it("throws MakitError('duplicate-page-id') on collision within a locale", () => {
    try {
      detectDuplicatePageIds([
        { pageId: "guide", locale: "en", sourcePath: "a.md" },
        { pageId: "guide", locale: "en", sourcePath: "b.md" },
      ]);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(MakitError);
      expect((error as MakitError).code).toBe("duplicate-page-id");
    }
  });

  it("allows the same pageId across different locales", () => {
    expect(() =>
      detectDuplicatePageIds([
        { pageId: "guide", locale: "en", sourcePath: "en/a.md" },
        { pageId: "guide", locale: "ja", sourcePath: "ja/a.md" },
      ]),
    ).not.toThrow();
  });
});
