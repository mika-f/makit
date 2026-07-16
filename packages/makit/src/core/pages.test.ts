import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import { MakitError } from "./errors.js";
import { buildAllPages } from "./pages.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "makit-pages-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function write(relativePath: string, content: string): Promise<void> {
  const fullPath = join(dir, relativePath);
  await mkdir(join(fullPath, ".."), { recursive: true });
  await writeFile(fullPath, content, "utf-8");
}

function configFor(root: string) {
  return resolveConfig({ title: "Test" }, { root, configPath: join(root, "makit.config.ts") });
}

describe("buildAllPages", () => {
  it("uses the front matter title when present", async () => {
    await write("docs/index.md", "---\ntitle: Explicit Title\n---\n# Different H1\n");
    const { pages } = await buildAllPages(configFor(dir));
    expect(pages[0]?.title).toBe("Explicit Title");
  });

  it("falls back to the first H1 when there is no front matter title", async () => {
    await write("docs/getting-started.md", "# From The Heading\n");
    const { pages } = await buildAllPages(configFor(dir));
    expect(pages[0]?.title).toBe("From The Heading");
  });

  it("falls back to a humanized filename when there is no H1 either", async () => {
    await write("docs/getting-started.md", "Just a paragraph, no heading.\n");
    const { pages } = await buildAllPages(configFor(dir));
    expect(pages[0]?.title).toBe("Getting Started");
  });

  it("derives pageId from route segments when no id is given", async () => {
    await write("docs/guides/configuration.md", "content");
    const { pages } = await buildAllPages(configFor(dir));
    expect(pages[0]?.pageId).toBe("guides/configuration");
  });

  it("uses the front matter id for pageId when given", async () => {
    await write("docs/guides/configuration.md", "---\nid: config\n---\ncontent");
    const { pages } = await buildAllPages(configFor(dir));
    expect(pages[0]?.pageId).toBe("config");
  });

  it("applies a slug override to the route", async () => {
    await write("docs/guides/configuration.md", "---\nslug: settings\n---\ncontent");
    const { pages } = await buildAllPages(configFor(dir));
    expect(pages[0]?.route).toBe("/settings/");
    expect(pages[0]?.segments).toEqual(["settings"]);
  });

  it("carries draft and hidden flags from front matter", async () => {
    await write("docs/index.md", "---\ndraft: true\nhidden: true\n---\ncontent");
    const { pages } = await buildAllPages(configFor(dir));
    expect(pages[0]?.draft).toBe(true);
    expect(pages[0]?.hidden).toBe(true);
  });

  it("defaults draft and hidden to false", async () => {
    await write("docs/index.md", "content");
    const { pages } = await buildAllPages(configFor(dir));
    expect(pages[0]?.draft).toBe(false);
    expect(pages[0]?.hidden).toBe(false);
  });

  it("carries SEO-relevant front matter into metadata", async () => {
    await write(
      "docs/index.md",
      "---\ncanonical: https://example.com/canonical/\nimage: /og.png\nnoindex: true\nnofollow: true\n---\ncontent",
    );
    const { pages } = await buildAllPages(configFor(dir));
    expect(pages[0]?.metadata).toEqual({
      canonical: "https://example.com/canonical/",
      image: "/og.png",
      noindex: true,
      nofollow: true,
      alternates: [],
    });
  });

  it("throws MakitError('duplicate-route') when two files produce the same route", async () => {
    await write("docs/guides.md", "content a");
    await write("docs/guides/index.md", "content b");
    await expect(buildAllPages(configFor(dir))).rejects.toMatchObject({ code: "duplicate-route" });
  });

  it("throws MakitError('duplicate-page-id') when two files share an explicit id", async () => {
    await write("docs/a.md", "---\nid: same\n---\ncontent");
    await write("docs/b.md", "---\nid: same\n---\ncontent");
    try {
      await buildAllPages(configFor(dir));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(MakitError);
      expect((error as MakitError).code).toBe("duplicate-page-id");
    }
  });

  it("collects per-page warnings with the source file path prefixed", async () => {
    await write("docs/index.md", "```not-a-lang\ncode\n```\n");
    const { warnings } = await buildAllPages(configFor(dir));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("index.md");
    expect(warnings[0]).toContain("not-a-lang");
  });
});
