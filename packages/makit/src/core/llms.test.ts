import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import type { GeneratedPage } from "../types/page.js";
import { markdownPathForRoute, writeLlmsFiles } from "./llms.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "makit-llms-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function page(overrides: Partial<GeneratedPage> = {}): GeneratedPage {
  return {
    pageId: "guide",
    collectionId: "default",
    route: "/guides/getting-started/",
    segments: ["guides", "getting-started"],
    pathSegments: ["guides", "getting-started"],
    locale: "en",
    contentLocale: "en",
    sourcePath: join(dir, "getting-started.md"),
    isFallback: false,
    title: "Getting started",
    description: "Set up Makit.",
    html: "",
    headings: [],
    draft: false,
    hidden: false,
    titleSource: "metadata",
    pageIdSource: "auto",
    sidebar: true,
    tableOfContents: true,
    hierarchy: [],
    breadcrumbs: [],
    metadata: { noindex: false, nofollow: false, alternates: [] },
    ...overrides,
  };
}

describe("LLM-ready static output", () => {
  it("maps rendered routes to extensioned Markdown routes", () => {
    expect(markdownPathForRoute("/")).toBe("/index.md");
    expect(markdownPathForRoute("/guides/getting-started/")).toBe("/guides/getting-started.md");
    expect(markdownPathForRoute("/guide")).toBe("/guide.md");
  });

  it("writes original Markdown together with llms.txt and llms-full.txt", async () => {
    const outDir = join(dir, "dist");
    await mkdir(outDir, { recursive: true });
    await writeFile(join(dir, "getting-started.md"), "# Start\n\nOriginal body.\n", "utf-8");
    const config = resolveConfig(
      { title: "Makit", description: "Static docs", siteUrl: "https://makit.example" },
      { root: dir, configPath: join(dir, "makit.config.ts") },
    );

    await writeLlmsFiles(outDir, [page()], config);

    await expect(readFile(join(outDir, "guides", "getting-started.md"), "utf-8")).resolves.toBe(
      "# Start\n\nOriginal body.\n",
    );
    await expect(readFile(join(outDir, "llms.txt"), "utf-8")).resolves.toContain(
      "[Getting started](https://makit.example/guides/getting-started.md): Set up Makit.",
    );
    await expect(readFile(join(outDir, "llms-full.txt"), "utf-8")).resolves.toContain(
      "Source: https://makit.example/guides/getting-started.md\n\n# Start\n\nOriginal body.",
    );
  });

  it("omits fallback and synthesized pages because neither has a distinct original source", async () => {
    const outDir = join(dir, "dist");
    await mkdir(outDir, { recursive: true });
    await writeFile(join(dir, "getting-started.md"), "# Start\n", "utf-8");
    const config = resolveConfig(
      { title: "Makit" },
      { root: dir, configPath: join(dir, "makit.config.ts") },
    );

    await writeLlmsFiles(
      outDir,
      [
        page({ isFallback: true }),
        page({ sourcePath: "collection (synthesized collection top, spec §34)" }),
      ],
      config,
    );

    await expect(readFile(join(outDir, "llms.txt"), "utf-8")).resolves.not.toContain(
      "Getting started",
    );
    await expect(readFile(join(outDir, "guides", "getting-started.md"), "utf-8")).rejects.toThrow();
  });

  it("writes Markdown under the output root while URLs keep basePath", async () => {
    const outDir = join(dir, "dist");
    await mkdir(outDir, { recursive: true });
    await writeFile(join(dir, "getting-started.md"), "# Start\n", "utf-8");
    await writeFile(join(dir, "index.md"), "# Home\n", "utf-8");
    const config = resolveConfig(
      { title: "Makit", siteUrl: "https://makit.example", basePath: "/docs" },
      { root: dir, configPath: join(dir, "makit.config.ts") },
    );

    await writeLlmsFiles(
      outDir,
      [
        page({ route: "/docs/ja-jp/getting-started/" }),
        page({
          pageId: "index",
          route: "/docs/",
          segments: [],
          pathSegments: [],
          sourcePath: join(dir, "index.md"),
          title: "Home",
          description: undefined,
        }),
      ],
      config,
    );

    await expect(readFile(join(outDir, "ja-jp", "getting-started.md"), "utf-8")).resolves.toBe(
      "# Start\n",
    );
    await expect(readFile(join(outDir, "index.md"), "utf-8")).resolves.toBe("# Home\n");
    await expect(
      readFile(join(outDir, "docs", "ja-jp", "getting-started.md"), "utf-8"),
    ).rejects.toThrow();
    const llms = await readFile(join(outDir, "llms.txt"), "utf-8");
    expect(llms).toContain(
      "[Getting started](https://makit.example/docs/ja-jp/getting-started.md): Set up Makit.",
    );
    expect(llms).toContain("[Home](https://makit.example/docs/index.md)");
    await expect(readFile(join(outDir, "llms-full.txt"), "utf-8")).resolves.toContain(
      "Source: https://makit.example/docs/ja-jp/getting-started.md",
    );
  });
});
