import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import type { MakitConfigParsed } from "../config/schema.js";
import { buildAllPages } from "./pages.js";
import { generateFallbackPages } from "./i18n.js";
import { buildSearchIndex } from "./search-index.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "makit-search-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function write(relativePath: string, content: string): Promise<void> {
  const fullPath = join(dir, relativePath);
  await mkdir(join(fullPath, ".."), { recursive: true });
  await writeFile(fullPath, content, "utf-8");
}

function makeConfig(overrides: MakitConfigParsed) {
  return resolveConfig(overrides, { root: dir, configPath: join(dir, "makit.config.ts") });
}

describe("buildSearchIndex", () => {
  it("includes title, route, locale, pageId, headings, and plain-text content", async () => {
    await write(
      "docs/guides/configuration.md",
      "---\nid: config\n---\n# Configuration\n\nSome **bold** text and a [link](https://example.com).\n\n## Options\n",
    );
    const config = makeConfig({ title: "Test" });
    const { pages } = await buildAllPages(config);

    const index = buildSearchIndex(pages);
    expect(index.en).toHaveLength(1);
    const entry = index.en![0]!;
    expect(entry.pageId).toBe("config");
    expect(entry.route).toBe("/guides/configuration/");
    expect(entry.locale).toBe("en");
    expect(entry.title).toBe("Configuration");
    expect(entry.headings).toEqual(["Configuration", "Options"]);
    expect(entry.content).toContain("Some bold text and a link");
    expect(entry.content).not.toContain("<");
  });

  it("groups entries by locale", async () => {
    await write("docs/en-us/index.md", "# Home EN");
    await write("docs/ja-jp/index.md", "# ホーム");
    const config = makeConfig({
      title: "Test",
      i18n: { defaultLocale: "en-US", locales: [{ locale: "en-US" }, { locale: "ja-JP" }] },
    });
    const { pages } = await buildAllPages(config);

    const index = buildSearchIndex(pages);
    expect(index["en-us"]).toHaveLength(1);
    expect(index["ja-jp"]).toHaveLength(1);
  });

  it("excludes fallback, hidden, and draft pages", async () => {
    await write("docs/en-us/guides/deployment.md", "# Deployment Guide");
    await write("docs/en-us/secret.md", "---\nhidden: true\n---\n# Secret");
    await write("docs/en-us/wip.md", "---\ndraft: true\n---\n# WIP");
    const config = makeConfig({
      title: "Test",
      i18n: { defaultLocale: "en-US", locales: [{ locale: "en-US" }, { locale: "ja-JP" }] },
    });
    const { pages } = await buildAllPages(config);
    const fallbackPages = generateFallbackPages(pages, config);

    const index = buildSearchIndex([...pages, ...fallbackPages]);
    expect(index["ja-jp"]).toBeUndefined();
    expect(index["en-us"]?.map((e) => e.pageId).sort()).toEqual(["guides/deployment"]);
  });
});
