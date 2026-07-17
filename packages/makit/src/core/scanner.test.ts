import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import { testCollections } from "../testing/fixtures.js";
import { scanSourceFiles } from "./scanner.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "makit-scanner-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function write(relativePath: string, content = "content"): Promise<void> {
  const fullPath = join(dir, relativePath);
  await mkdir(join(fullPath, ".."), { recursive: true });
  await writeFile(fullPath, content, "utf-8");
}

describe("scanSourceFiles", () => {
  it("finds .md and .markdown files in a single-locale project", async () => {
    await write("docs/index.md");
    await write("docs/guides/configuration.markdown");
    await write("docs/notes.txt");

    const config = resolveConfig(
      { title: "Test" },
      { root: dir, configPath: join(dir, "makit.config.ts") },
    );
    const files = await scanSourceFiles(config, await testCollections(config));

    const relativePaths = files.map((f) => f.relativePath).sort();
    expect(relativePaths).toEqual(["guides/configuration.markdown", "index.md"]);
  });

  it("excludes node_modules, .git, .makit, and dotfiles", async () => {
    await write("docs/index.md");
    await write("docs/node_modules/pkg/readme.md");
    await write("docs/.git/hidden.md");
    await write("docs/.makit/generated.md");
    await write("docs/.hidden.md");

    const config = resolveConfig(
      { title: "Test" },
      { root: dir, configPath: join(dir, "makit.config.ts") },
    );
    const files = await scanSourceFiles(config, await testCollections(config));

    expect(files.map((f) => f.relativePath)).toEqual(["index.md"]);
  });

  it("excludes files under outDir when it is nested inside sourceDir", async () => {
    await write("docs/index.md");
    await write("docs/dist/leftover.md");

    const config = resolveConfig(
      { title: "Test", sourceDir: "docs", outDir: "docs/dist" },
      { root: dir, configPath: join(dir, "makit.config.ts") },
    );
    const files = await scanSourceFiles(config, await testCollections(config));

    expect(files.map((f) => f.relativePath)).toEqual(["index.md"]);
  });

  it("scans each locale's own sourceDir when i18n is enabled", async () => {
    await write("docs/en-us/index.md");
    await write("docs/ja-jp/index.md");

    const config = resolveConfig(
      {
        title: "Test",
        i18n: { defaultLocale: "en-US", locales: [{ locale: "en-US" }, { locale: "ja-JP" }] },
      },
      { root: dir, configPath: join(dir, "makit.config.ts") },
    );
    const files = await scanSourceFiles(config, await testCollections(config));

    expect(files).toHaveLength(2);
    expect(files.map((f) => f.locale.urlLocale).sort()).toEqual(["en-us", "ja-jp"]);
  });

  it("respects a per-locale sourceDir override", async () => {
    await write("documentation/en/index.md");

    const config = resolveConfig(
      {
        title: "Test",
        i18n: {
          defaultLocale: "en-US",
          locales: [{ locale: "en-US", sourceDir: "documentation/en" }],
        },
      },
      { root: dir, configPath: join(dir, "makit.config.ts") },
    );
    const files = await scanSourceFiles(config, await testCollections(config));

    expect(files.map((f) => f.relativePath)).toEqual(["index.md"]);
  });
});
