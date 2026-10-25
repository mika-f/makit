import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import { build, cleanBuildOutput } from "./build.js";
import { createLogger } from "./logger.js";

let dir: string;

async function touch(relativePath: string): Promise<void> {
  const fullPath = join(dir, relativePath);
  await mkdir(join(fullPath, ".."), { recursive: true });
  await writeFile(fullPath, "x", "utf-8");
}

async function exists(relativePath: string): Promise<boolean> {
  return access(join(dir, relativePath)).then(
    () => true,
    () => false,
  );
}

describe("cleanBuildOutput", () => {
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "makit-build-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("removes outDir and the Next.js build cache, keeping makit caches", async () => {
    const config = resolveConfig(
      { title: "Test" },
      { root: dir, configPath: join(dir, "makit.config.ts") },
    );
    await touch(join(config.outDir, "index.html"));
    await touch(".makit/.next/cache/styles.css");
    await touch(".makit/out/index.html");
    await touch(".makit/cache/metadata/entry.json");

    await cleanBuildOutput(config);

    expect(await exists(config.outDir)).toBe(false);
    expect(await exists(".makit/.next")).toBe(false);
    expect(await exists(".makit/out")).toBe(false);
    expect(await exists(".makit/cache/metadata/entry.json")).toBe(true);
  });

  it("is a no-op when nothing has been built yet", async () => {
    const config = resolveConfig(
      { title: "Test" },
      { root: dir, configPath: join(dir, "makit.config.ts") },
    );
    await expect(cleanBuildOutput(config)).resolves.toBeUndefined();
  });
});

/** Reads the `lang`/`dir` attributes of an exported page's `<html>` element. */
async function htmlAttributes(
  outDir: string,
  path: string,
): Promise<{ lang?: string; dir?: string }> {
  const html = await readFile(join(outDir, path), "utf-8");
  const tag = html.match(/<html\b[^>]*>/)?.[0] ?? "";
  return {
    lang: tag.match(/\slang="([^"]*)"/)?.[1],
    dir: tag.match(/\sdir="([^"]*)"/)?.[1],
  };
}

/**
 * A real `next build` of a small multi-locale site: the only way to check what
 * ends up in the exported HTML, since `<html lang>` is decided by how the
 * generated routes and layouts fit together.
 */
describe("build: per-locale <html lang>", () => {
  let root: string;
  let outDir: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "makit-build-lang-"));
    const titles: Record<string, string> = { en: "Hello", ja: "こんにちは", ar: "مرحبا" };
    for (const [locale, title] of Object.entries(titles)) {
      await mkdir(join(root, "docs", locale), { recursive: true });
      await writeFile(join(root, "docs", locale, "index.md"), `# ${title}\n`);
      await writeFile(join(root, "docs", locale, "guide.md"), `# ${title} guide\n`);
    }

    const config = resolveConfig(
      {
        title: "Lang fixture",
        lang: "en",
        sourceDir: "docs",
        i18n: {
          defaultLocale: "en",
          locales: [
            { locale: "en", label: "English" },
            { locale: "ja", label: "日本語", lang: "ja-JP" },
            { locale: "ar", label: "العربية", dir: "rtl" },
          ],
        },
      },
      { root, configPath: join(root, "makit.config.ts") },
    );
    const result = await build(config, { silent: true }, createLogger({ silent: true }));
    outDir = result.outDir;
  }, 180_000);

  afterAll(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("writes each locale's lang under its own URL prefix", async () => {
    expect(await htmlAttributes(outDir, "ja/index.html")).toEqual({ lang: "ja-JP", dir: "ltr" });
    expect(await htmlAttributes(outDir, "ja/guide/index.html")).toEqual({
      lang: "ja-JP",
      dir: "ltr",
    });
    expect(await htmlAttributes(outDir, "en/guide/index.html")).toEqual({ lang: "en", dir: "ltr" });
  });

  it("falls back to the locale key and carries the locale's dir", async () => {
    expect(await htmlAttributes(outDir, "ar/guide/index.html")).toEqual({ lang: "ar", dir: "rtl" });
  });

  it("keeps site.lang for routes outside any locale", async () => {
    expect(await htmlAttributes(outDir, "index.html")).toEqual({ lang: "en", dir: undefined });
    expect(await htmlAttributes(outDir, "404.html")).toEqual({ lang: "en", dir: undefined });
  });

  it("renders a single document per page", async () => {
    for (const path of ["index.html", "404.html", "ja/guide/index.html"]) {
      const html = await readFile(join(outDir, path), "utf-8");
      expect(html.match(/<html\b/g)).toHaveLength(1);
      expect(html.match(/<body\b/g)).toHaveLength(1);
    }
  });
});
