import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import { writeGeneratedData } from "./generate.js";
import { buildAllPages } from "./pages.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "makit-generate-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function write(relativePath: string, content: string): Promise<void> {
  const fullPath = join(dir, relativePath);
  await mkdir(join(fullPath, ".."), { recursive: true });
  await writeFile(fullPath, content, "utf-8");
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf-8"));
}

describe("writeGeneratedData", () => {
  it("writes manifest.json, site.json, locales.json, and one JSON file per page", async () => {
    await write("docs/index.md", "# Home\n");
    await write("docs/guides/configuration.md", "---\nid: config\n---\n# Configuration\n");

    const config = resolveConfig(
      { title: "My Docs" },
      { root: dir, configPath: join(dir, "makit.config.ts") },
    );
    const { pages } = await buildAllPages(config);
    const { generatedDir } = await writeGeneratedData(config, pages);

    expect(generatedDir).toBe(join(dir, ".makit", "generated"));

    const manifest = (await readJson(join(generatedDir, "manifest.json"))) as {
      pages: { route: string }[];
    };
    expect(manifest.pages.map((p) => p.route).sort()).toEqual(["/", "/guides/configuration/"]);

    const site = (await readJson(join(generatedDir, "site.json"))) as { title: string };
    expect(site.title).toBe("My Docs");

    const locales = (await readJson(join(generatedDir, "locales.json"))) as { enabled: boolean };
    expect(locales.enabled).toBe(false);

    const indexPage = (await readJson(join(generatedDir, "pages", "en", "index.json"))) as {
      route: string;
    };
    expect(indexPage.route).toBe("/");

    const configPage = (await readJson(join(generatedDir, "pages", "en", "config.json"))) as {
      route: string;
    };
    expect(configPage.route).toBe("/guides/configuration/");
  });

  it("nests page JSON files under locale subdirectories for i18n projects", async () => {
    await write("docs/en-us/index.md", "# Home\n");
    await write("docs/ja-jp/index.md", "# ホーム\n");

    const config = resolveConfig(
      {
        title: "My Docs",
        i18n: { defaultLocale: "en-US", locales: [{ locale: "en-US" }, { locale: "ja-JP" }] },
      },
      { root: dir, configPath: join(dir, "makit.config.ts") },
    );
    const { pages } = await buildAllPages(config);
    const { generatedDir } = await writeGeneratedData(config, pages);

    const enIndex = (await readJson(join(generatedDir, "pages", "en-us", "index.json"))) as {
      locale: string;
    };
    const jaIndex = (await readJson(join(generatedDir, "pages", "ja-jp", "index.json"))) as {
      locale: string;
    };
    expect(enIndex.locale).toBe("en-us");
    expect(jaIndex.locale).toBe("ja-jp");
  });
});
