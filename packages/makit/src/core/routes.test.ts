import { describe, expect, it } from "vitest";
import { MakitError } from "./errors.js";
import {
  buildRoute,
  derivePageId,
  detectDuplicatePageIds,
  detectDuplicateRoutes,
  fileNameOrder,
  filePathToRouteSegments,
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

  it("strips numeric ordering prefixes per segment (ORDER-PREFIX §4)", () => {
    expect(filePathToSegments("02-getting-started/01-installation.md")).toEqual([
      "getting-started",
      "installation",
    ]);
  });

  it("handles a prefixed index file the same as index.md (ORDER-PREFIX §11)", () => {
    expect(filePathToSegments("02-getting-started/01-index.md")).toEqual(["getting-started"]);
    expect(filePathToSegments("02-getting-started/index.md")).toEqual(["getting-started"]);
  });

  it("renaming only the prefix leaves segments unchanged (ORDER-PREFIX §6)", () => {
    expect(filePathToSegments("01-installation.md")).toEqual(
      filePathToSegments("05-installation.md"),
    );
  });

  it("leaves prefixes in place when numericPrefixes is disabled (ORDER-PREFIX §18)", () => {
    expect(
      filePathToSegments("02-getting-started/01-installation.md", { numericPrefixes: false }),
    ).toEqual(["02-getting-started", "01-installation"]);
  });

  it("keeps a route group's unwrapped name as a segment (ROUTE-GROUPS §3)", () => {
    expect(filePathToSegments("(marketing)/about.md")).toEqual(["marketing", "about"]);
  });

  it("keeps nested route groups unwrapped", () => {
    expect(filePathToSegments("(marketing)/(landing)/about.md")).toEqual([
      "marketing",
      "landing",
      "about",
    ]);
  });

  it("does not treat a route-group-shaped filename as a group", () => {
    expect(filePathToSegments("guides/(configuration).md")).toEqual(["guides", "(configuration)"]);
  });

  it("leaves route groups wrapped when routeGroups is disabled", () => {
    expect(filePathToSegments("(marketing)/about.md", { routeGroups: false })).toEqual([
      "(marketing)",
      "about",
    ]);
  });

  it("combines an ordering prefix and route group on the same segment", () => {
    expect(filePathToSegments("01-(marketing)/about.md")).toEqual(["marketing", "about"]);
  });

  it('omits a route group entirely under routeGroups: "flatten" (ROUTE-GROUPS §9)', () => {
    expect(filePathToSegments("(marketing)/about.md", { routeGroups: "flatten" })).toEqual([
      "about",
    ]);
  });

  it('promotes a group\'s children up to the grandparent under "flatten"', () => {
    expect(
      filePathToSegments("guides/(internal)/setup.md", { routeGroups: "flatten" }),
    ).toEqual(["guides", "setup"]);
  });

  it('resolves a "flatten"-mode group\'s own index page to its parent', () => {
    expect(filePathToSegments("(marketing)/index.md", { routeGroups: "flatten" })).toEqual([]);
  });
});

describe("filePathToRouteSegments", () => {
  it("matches filePathToSegments when there are no route groups", () => {
    expect(filePathToRouteSegments("guides/configuration.md")).toEqual([
      "guides",
      "configuration",
    ]);
  });

  it("omits a route group entirely from the URL (ROUTE-GROUPS §4)", () => {
    expect(filePathToRouteSegments("(marketing)/about.md")).toEqual(["about"]);
  });

  it("omits multiple nested route groups", () => {
    expect(filePathToRouteSegments("(marketing)/(landing)/about.md")).toEqual(["about"]);
  });

  it("resolves to the root when a group's index page has no other segments", () => {
    expect(filePathToRouteSegments("(marketing)/index.md")).toEqual([]);
  });

  it("does not omit a route-group-shaped filename", () => {
    expect(filePathToRouteSegments("guides/(configuration).md")).toEqual([
      "guides",
      "(configuration)",
    ]);
  });

  it("keeps route groups as literal segments when routeGroups is disabled", () => {
    expect(filePathToRouteSegments("(marketing)/about.md", { routeGroups: false })).toEqual([
      "(marketing)",
      "about",
    ]);
  });

  it('omits the group from the URL the same way under "flatten" mode', () => {
    expect(filePathToRouteSegments("(marketing)/about.md", { routeGroups: "flatten" })).toEqual([
      "about",
    ]);
  });
});

describe("fileNameOrder", () => {
  it("parses the file's own numeric prefix", () => {
    expect(fileNameOrder("02-getting-started/01-installation.md")).toBe(1);
  });

  it("returns undefined when there is no prefix", () => {
    expect(fileNameOrder("guides/configuration.md")).toBeUndefined();
  });

  it("returns undefined when disabled, without throwing on an otherwise-invalid name", () => {
    expect(fileNameOrder("01-.md", { numericPrefixes: false })).toBeUndefined();
  });

  it("still applies to an index file's own name (ORDER-PREFIX §11)", () => {
    expect(fileNameOrder("02-getting-started/01-index.md")).toBe(1);
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

  it("falls back to dot-joined path segments (spec §18)", () => {
    expect(derivePageId(undefined, ["guides", "configuration"])).toBe("guides.configuration");
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
        { pageId: "guide", locale: "en", collectionId: "default", sourcePath: "a.md" },
        { pageId: "guide", locale: "en", collectionId: "default", sourcePath: "b.md" },
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
        { pageId: "guide", locale: "en", collectionId: "default", sourcePath: "en/a.md" },
        { pageId: "guide", locale: "ja", collectionId: "default", sourcePath: "ja/a.md" },
      ]),
    ).not.toThrow();
  });
});
