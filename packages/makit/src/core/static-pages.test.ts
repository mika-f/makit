import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import type { MakitConfigParsed } from "../config/schema.js";
import type { StaticPageMetadata } from "../metadata/types.js";
import { buildPagesForTest, staticPageMetaSource } from "../testing/fixtures.js";
import type { GeneratedStaticPage } from "../types/static-page.js";
import { MakitError } from "./errors.js";
import { assertStaticPageRoutes, buildStaticPages } from "./static-pages.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "makit-static-pages-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function write(relativePath: string, content = ""): Promise<void> {
  const fullPath = join(dir, relativePath);
  await mkdir(join(fullPath, ".."), { recursive: true });
  await writeFile(fullPath, content, "utf-8");
}

async function writeMeta(relativePath: string, metadata: StaticPageMetadata): Promise<void> {
  await write(relativePath, staticPageMetaSource(metadata));
}

function config(overrides: Partial<MakitConfigParsed> = {}) {
  return resolveConfig(
    { title: "Site", ...overrides },
    { root: dir, configPath: join(dir, "makit.config.ts") },
  );
}

const i18n: Partial<MakitConfigParsed> = {
  i18n: { defaultLocale: "en-US", locales: [{ locale: "en-US" }, { locale: "ja-JP" }] },
};

function find(
  pages: readonly GeneratedStaticPage[],
  id: string,
  locale: string,
): GeneratedStaticPage {
  const page = pages.find((candidate) => candidate.id === id && candidate.locale === locale);
  if (!page) throw new Error(`no static page ${id} in ${locale}`);
  return page;
}

describe("buildStaticPages (STATIC-PAGES §9, §12.2)", () => {
  it("resolves metadata per locale", async () => {
    await write("pages/pricing.tsx");
    await writeMeta("pages/pricing.meta.ts", {
      title: { "en-US": "Pricing", "ja-JP": "料金" },
      description: "d",
      layout: "bare",
      search: true,
      image: "/og.png",
      noindex: true,
    });

    const { staticPages } = await buildStaticPages(config(i18n), { includeDrafts: false });

    expect(find(staticPages, "pricing", "en-us").title).toBe("Pricing");
    expect(find(staticPages, "pricing", "ja-jp").title).toBe("料金");
    expect(find(staticPages, "pricing", "en-us")).toMatchObject({
      description: "d",
      layout: "bare",
      search: true,
      kind: "component",
      componentKey: "pricing",
      html: undefined,
      route: "/en-us/pricing/",
      segments: ["pricing"],
      sourcePath: join(dir, "pages/pricing.tsx"),
      metadataPath: join(dir, "pages/pricing.meta.ts"),
      metadata: expect.objectContaining({ image: "/og.png", noindex: true, nofollow: false }),
    });
  });

  it("applies defaults and warns about a missing title", async () => {
    await write("pages/about.html", "<p>a</p>");

    const { staticPages, diagnostics } = await buildStaticPages(config(), {
      includeDrafts: false,
    });

    expect(staticPages).toEqual([
      expect.objectContaining({
        id: "about",
        title: "about",
        layout: "default",
        search: false,
        draft: false,
        kind: "html",
        html: "<p>a</p>",
        componentKey: undefined,
      }),
    ]);
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["static-page-missing-title"]);
  });

  it("derives a fallback title from the directory or the site title", async () => {
    await write("pages/company/index.tsx");
    await write("pages/index.tsx");

    const { staticPages } = await buildStaticPages(config(), { includeDrafts: false });

    expect(find(staticPages, "company/index", "en").title).toBe("company");
    expect(find(staticPages, "index", "en").title).toBe("Site");
  });

  it("warns about a full HTML document", async () => {
    await writeMeta("pages/about.meta.ts", { title: "About" });
    await write("pages/about.html", "<html><body><p>a</p></body></html>");

    const { staticPages, diagnostics } = await buildStaticPages(config(), {
      includeDrafts: false,
    });

    expect(staticPages[0]?.html).toBe("<p>a</p>");
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "static-page-html-document",
        sourcePath: join(dir, "pages/about.html"),
      }),
    ]);
  });

  it("prefixes basePath inside HTML fragments", async () => {
    await writeMeta("pages/about.meta.ts", { title: "About" });
    await write("pages/about.html", '<a href="/pricing/">p</a>');

    const { staticPages } = await buildStaticPages(config({ basePath: "/docs" }), {
      includeDrafts: false,
    });

    expect(staticPages[0]?.html).toBe('<a href="/docs/pricing/">p</a>');
  });

  it("lists the other locales as alternates", async () => {
    await writeMeta("pages/about.meta.ts", { title: "About" });
    await write("pages/about.html");
    await write("pages/about.ja-jp.html");

    const { staticPages } = await buildStaticPages(config(i18n), { includeDrafts: false });
    const alternates = find(staticPages, "about", "en-us").metadata.alternates;

    expect(alternates).toContainEqual({
      urlLocale: "ja-jp",
      hreflang: "ja-JP",
      href: "/ja-jp/about/",
    });
    expect(alternates.some((alternate) => alternate.urlLocale === "en-us")).toBe(false);
  });

  it("leaves out drafts unless asked to include them", async () => {
    await writeMeta("pages/about.meta.ts", { title: "About", draft: true });
    await write("pages/about.html");
    await write("pages/about.ja-jp.html");
    await writeMeta("pages/contact.meta.ts", { title: "Contact" });
    await write("pages/contact.html");

    const production = await buildStaticPages(config(i18n), { includeDrafts: false });
    expect(production.staticPages.map((page) => page.id)).toEqual(["contact", "contact"]);

    const dev = await buildStaticPages(config(i18n), { includeDrafts: true });
    const about = find(dev.staticPages, "about", "en-us");
    expect(about.draft).toBe(true);
    expect(about.metadata.alternates).toContainEqual(
      expect.objectContaining({ urlLocale: "ja-jp" }),
    );
  });

  it("reports metadata files for the dev watcher", async () => {
    await write("pages/pricing.tsx");
    await writeMeta("pages/pricing.meta.ts", { title: "Pricing" });

    const { watchPaths } = await buildStaticPages(config(), { includeDrafts: false });

    expect(watchPaths).toContain(join(dir, "pages/pricing.meta.ts"));
  });
});

describe("assertStaticPageRoutes (STATIC-PAGES §14, §16)", () => {
  async function routeErrorCode(overrides: Partial<MakitConfigParsed> = {}) {
    const cfg = config(overrides);
    const { pages } = await buildPagesForTest(cfg);
    const { staticPages } = await buildStaticPages(cfg, { includeDrafts: false });
    try {
      assertStaticPageRoutes(staticPages, pages, cfg);
      return undefined;
    } catch (error) {
      return error instanceof MakitError ? error.code : "not-a-makit-error";
    }
  }

  it("rejects a static page on a Markdown page's URL", async () => {
    await write("docs/pricing.md", "# Pricing\n");
    await write("pages/pricing.tsx");
    expect(await routeErrorCode()).toBe("static-page-route-conflict");
  });

  it("rejects two static pages on the same URL", async () => {
    await write("docs/guide.md", "# Guide\n");
    await write("pages/company.tsx");
    await write("pages/company/index.tsx");
    expect(await routeErrorCode()).toBe("static-page-route-conflict");
  });

  it("rejects a static index next to an explicit home layout", async () => {
    await write("docs/guide.md", "# Guide\n");
    await write("pages/index.tsx");
    expect(await routeErrorCode({ home: { layout: "portal" } })).toBe("static-page-home-conflict");
  });

  it("rejects a static index when a Markdown page owns the site root", async () => {
    await write("docs/index.md", "# Home\n");
    await write("pages/index.tsx");
    expect(await routeErrorCode()).toBe("static-page-route-conflict");
  });

  it("accepts a static index when nothing else owns the site root", async () => {
    await write("docs/guide.md", "# Guide\n");
    await write("pages/index.tsx");
    expect(await routeErrorCode()).toBeUndefined();
  });
});
