import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import type { MakitConfigParsed } from "../config/schema.js";
import { MakitError } from "./errors.js";
import {
  resolveStaticPageLocales,
  scanStaticPageSources,
  type StaticPageSource,
} from "./static-page-sources.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "makit-static-sources-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function write(relativePath: string, content = ""): Promise<void> {
  const fullPath = join(dir, relativePath);
  await mkdir(join(fullPath, ".."), { recursive: true });
  await writeFile(fullPath, content, "utf-8");
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

async function scanError(cfg: ReturnType<typeof config>): Promise<string | undefined> {
  try {
    await scanStaticPageSources(cfg);
    return undefined;
  } catch (error) {
    return error instanceof MakitError ? error.code : "not-a-makit-error";
  }
}

function byId(sources: readonly StaticPageSource[]): Record<string, StaticPageSource> {
  return Object.fromEntries(sources.map((source) => [source.componentKey, source]));
}

describe("scanStaticPageSources (STATIC-PAGES §4, §6)", () => {
  it("derives the ID and kind from the file path", async () => {
    await write("pages/pricing.tsx");
    await write("pages/company/about.html");
    await write("pages/index.jsx");

    const { sources } = await scanStaticPageSources(config());
    const sourcesById = byId(sources);

    expect(Object.keys(sourcesById).sort()).toEqual(["company/about", "index", "pricing"]);
    expect(sourcesById["pricing"]).toMatchObject({
      id: "pricing",
      kind: "component",
      absolutePath: join(dir, "pages/pricing.tsx"),
    });
    expect(sourcesById["company/about"]).toMatchObject({ id: "company/about", kind: "html" });
    expect(sourcesById["index"]).toMatchObject({ id: "index", kind: "component" });
  });

  it("ignores underscore-prefixed files and directories, dotfiles, and other extensions", async () => {
    await write("pages/pricing.tsx");
    await write("pages/_components/hero.tsx");
    await write("pages/_util.tsx");
    await write("pages/.hidden.tsx");
    await write("pages/notes.md");
    await write("pages/pricing.meta.ts");

    const { sources } = await scanStaticPageSources(config());

    expect(sources.map((source) => source.id)).toEqual(["pricing"]);
  });

  it("attaches the sibling .meta.ts", async () => {
    await write("pages/pricing.tsx");
    await write("pages/pricing.meta.ts");
    await write("pages/about.html");

    const sourcesById = byId((await scanStaticPageSources(config())).sources);

    expect(sourcesById["pricing"]?.metadataPath).toBe(join(dir, "pages/pricing.meta.ts"));
    expect(sourcesById["about"]?.metadataPath).toBeUndefined();
  });

  it("returns nothing when disabled or when the directory is missing", async () => {
    await write("pages/pricing.tsx");

    expect(await scanStaticPageSources(config({ staticPages: { dir: false } }))).toEqual({
      sources: [],
      diagnostics: [],
    });
    expect(await scanStaticPageSources(config({ staticPages: { dir: "site" } }))).toEqual({
      sources: [],
      diagnostics: [],
    });
  });

  it("reads a locale suffix when i18n is enabled, case-insensitively", async () => {
    await write("pages/about.html");
    await write("pages/about.ja-jp.html");
    await write("pages/contact.JA-JP.html");

    const sourcesById = byId((await scanStaticPageSources(config(i18n))).sources);

    expect(sourcesById["about"]?.localeSuffix).toBeUndefined();
    expect(sourcesById["about.ja-jp"]).toMatchObject({ id: "about", localeSuffix: "ja-jp" });
    expect(sourcesById["contact.JA-JP"]).toMatchObject({ id: "contact", localeSuffix: "ja-jp" });
  });

  it("rejects a locale-shaped suffix that matches no configured locale", async () => {
    await write("pages/about.fr-fr.html");

    expect(await scanError(config(i18n))).toBe("static-page-unknown-locale");
  });

  it("keeps a suffix that is not locale-shaped as part of the ID", async () => {
    await write("pages/pricing.v2.tsx");
    await write("pages/about.old.tsx");

    const { sources } = await scanStaticPageSources(config(i18n));

    expect(sources.map((source) => source.id).sort()).toEqual(["about.old", "pricing.v2"]);
  });

  it("does not read locale suffixes when i18n is disabled", async () => {
    await write("pages/about.ja-jp.html");

    const { sources } = await scanStaticPageSources(config());

    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ id: "about.ja-jp", localeSuffix: undefined });
  });

  it("warns about a locale-specific .meta.ts", async () => {
    await write("pages/about.html");
    await write("pages/about.ja-jp.html");
    await write("pages/about.ja-jp.meta.ts");

    const { diagnostics } = await scanStaticPageSources(config(i18n));

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "static-page-locale-metadata",
        sourcePath: join(dir, "pages/about.ja-jp.meta.ts"),
      }),
    ]);
  });

  it("rejects two files for the same ID and locale", async () => {
    await write("pages/about.tsx");
    await write("pages/about.html");
    expect(await scanError(config())).toBe("static-page-ambiguous-file");
  });

  it("rejects two locale-specific files for the same ID and locale", async () => {
    await write("pages/about.ja-jp.tsx");
    await write("pages/about.ja-jp.html");
    expect(await scanError(config(i18n))).toBe("static-page-ambiguous-file");
  });

  it("allows a shared file and a locale-specific file with different extensions", async () => {
    await write("pages/about.tsx");
    await write("pages/about.ja-jp.html");
    expect(await scanError(config(i18n))).toBeUndefined();
  });
});

describe("resolveStaticPageLocales (STATIC-PAGES §5, §6)", () => {
  it("prefers a locale-specific file and falls back to the shared one", async () => {
    await write("pages/about.html");
    await write("pages/about.ja-jp.html");
    const cfg = config(i18n);

    const resolved = resolveStaticPageLocales((await scanStaticPageSources(cfg)).sources, cfg);

    expect(
      resolved.map((entry) => [entry.locale.urlLocale, entry.source.componentKey, entry.route]),
    ).toEqual([
      ["en-us", "about", "/en-us/about/"],
      ["ja-jp", "about.ja-jp", "/ja-jp/about/"],
    ]);
  });

  it("only creates a locale-only page in that locale", async () => {
    await write("pages/contact.ja-jp.html");
    const cfg = config(i18n);

    const resolved = resolveStaticPageLocales((await scanStaticPageSources(cfg)).sources, cfg);

    expect(resolved.map((entry) => entry.locale.urlLocale)).toEqual(["ja-jp"]);
  });

  it("drops a trailing index segment", async () => {
    await write("pages/index.tsx");
    await write("pages/company/index.tsx");
    const cfg = config(i18n);

    const resolved = resolveStaticPageLocales((await scanStaticPageSources(cfg)).sources, cfg);
    const en = resolved.filter((entry) => entry.locale.urlLocale === "en-us");

    expect(en.map((entry) => [entry.source.id, entry.segments, entry.route])).toEqual([
      ["company/index", ["company"], "/en-us/company/"],
      ["index", [], "/en-us/"],
    ]);
  });

  it("applies basePath and trailingSlash: false", async () => {
    await write("pages/index.tsx");
    await write("pages/pricing.tsx");
    const cfg = config({ basePath: "/docs", build: { trailingSlash: false } });

    const resolved = resolveStaticPageLocales((await scanStaticPageSources(cfg)).sources, cfg);

    expect(resolved.map((entry) => [entry.source.id, entry.route])).toEqual([
      // The site root always keeps its slash, like every other home route (buildRoute).
      ["index", "/docs/"],
      ["pricing", "/docs/pricing"],
    ]);
  });
});
