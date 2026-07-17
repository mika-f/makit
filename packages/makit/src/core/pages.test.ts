import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import type { PageMetadata } from "../metadata/types.js";
import { buildPagesForTest, pageMetaSource } from "../testing/fixtures.js";
import { MakitError } from "./errors.js";

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

async function writeMeta(markdownRelativePath: string, metadata: PageMetadata): Promise<void> {
  const metaPath = markdownRelativePath.replace(/\.(md|markdown)$/i, ".meta.ts");
  await write(metaPath, pageMetaSource(metadata));
}

function configFor(root: string, extra: Record<string, unknown> = {}) {
  return resolveConfig(
    { title: "Test", ...extra },
    { root, configPath: join(root, "makit.config.ts") },
  );
}

describe("buildAllPages", () => {
  it("uses the .meta.ts title when present", async () => {
    await write("docs/index.md", "# Different H1\n");
    await writeMeta("docs/index.md", { title: "Explicit Title" });
    const { pages } = await buildPagesForTest(configFor(dir));
    expect(pages[0]?.title).toBe("Explicit Title");
    expect(pages[0]?.titleSource).toBe("metadata");
  });

  it("falls back to the first H1 when there is no .meta.ts title", async () => {
    await write("docs/getting-started.md", "# From The Heading\n");
    const { pages } = await buildPagesForTest(configFor(dir));
    expect(pages[0]?.title).toBe("From The Heading");
    expect(pages[0]?.titleSource).toBe("heading");
  });

  it("falls back to a humanized filename when there is no H1 either", async () => {
    await write("docs/getting-started.md", "Just a paragraph, no heading.\n");
    const { pages } = await buildPagesForTest(configFor(dir));
    expect(pages[0]?.title).toBe("Getting Started");
    expect(pages[0]?.titleSource).toBe("filename");
  });

  it("derives a dot-joined pageId from the file path when no id is given (spec §18)", async () => {
    await write("docs/guides/configuration.md", "content");
    const { pages } = await buildPagesForTest(configFor(dir));
    expect(pages[0]?.pageId).toBe("guides.configuration");
    expect(pages[0]?.pageIdSource).toBe("auto");
  });

  it("uses the .meta.ts id for pageId when given", async () => {
    await write("docs/guides/configuration.md", "content");
    await writeMeta("docs/guides/configuration.md", { id: "config" });
    const { pages } = await buildPagesForTest(configFor(dir));
    expect(pages[0]?.pageId).toBe("config");
    expect(pages[0]?.pageIdSource).toBe("metadata");
  });

  it("applies a slug override to the route but not to the auto pageId", async () => {
    await write("docs/guides/configuration.md", "content");
    await writeMeta("docs/guides/configuration.md", { slug: "settings" });
    const { pages } = await buildPagesForTest(configFor(dir));
    expect(pages[0]?.route).toBe("/settings/");
    expect(pages[0]?.segments).toEqual(["settings"]);
    // The auto ID stays path-derived so URLs can change without breaking
    // translation pairing (spec §18, §29).
    expect(pages[0]?.pageId).toBe("guides.configuration");
  });

  it("carries draft and hidden flags from .meta.ts", async () => {
    await write("docs/index.md", "content");
    await writeMeta("docs/index.md", { draft: true, hidden: true });
    const { pages } = await buildPagesForTest(configFor(dir));
    expect(pages[0]?.draft).toBe(true);
    expect(pages[0]?.hidden).toBe(true);
  });

  it("defaults draft and hidden to false", async () => {
    await write("docs/index.md", "content");
    const { pages } = await buildPagesForTest(configFor(dir));
    expect(pages[0]?.draft).toBe(false);
    expect(pages[0]?.hidden).toBe(false);
  });

  it("carries SEO-relevant .meta.ts fields into metadata", async () => {
    await write("docs/index.md", "content");
    await writeMeta("docs/index.md", {
      canonical: "https://example.com/canonical/",
      image: "/og.png",
      noindex: true,
      nofollow: true,
    });
    const { pages } = await buildPagesForTest(configFor(dir));
    expect(pages[0]?.metadata).toEqual({
      canonical: "https://example.com/canonical/",
      image: "/og.png",
      noindex: true,
      nofollow: true,
      alternates: [],
    });
  });

  it("carries taxonomy and navigation.primary from .meta.ts", async () => {
    await write("docs/configuration.md", "content");
    await writeMeta("docs/configuration.md", {
      taxonomy: { topics: ["deployment"], audiences: ["developers"] },
      navigation: { primary: ["getting-started", "configuration"] },
    });
    const { pages } = await buildPagesForTest(configFor(dir));
    expect(pages[0]?.taxonomy).toEqual({ topics: ["deployment"], audiences: ["developers"] });
    expect(pages[0]?.navigation?.primary).toEqual(["getting-started", "configuration"]);
  });

  it("records metadataPath when a .meta.ts exists", async () => {
    await write("docs/index.md", "content");
    await writeMeta("docs/index.md", { title: "Home" });
    const { pages } = await buildPagesForTest(configFor(dir));
    expect(pages[0]?.metadataPath).toBe(join(dir, "docs", "index.meta.ts"));
  });

  it("collects every .meta.ts path for watching, even for pages without one (spec §19, §43)", async () => {
    await write("docs/index.md", "content");
    await writeMeta("docs/index.md", { title: "Home" });
    await write("docs/about.md", "content");
    const { metadataPaths } = await buildPagesForTest(configFor(dir));
    expect(metadataPaths).toEqual([join(dir, "docs", "index.meta.ts")]);
  });

  it("parses flat front matter as page metadata by default", async () => {
    await write("docs/index.md", "---\ntitle: Old Style\norder: 3\n---\n# Heading\n");
    const { pages } = await buildPagesForTest(configFor(dir));
    expect(pages[0]?.title).toBe("Old Style");
    expect(pages[0]?.order).toBe(3);
    // The front matter block itself must not leak into the rendered body.
    expect(pages[0]?.html).not.toContain("Old Style");
    expect(pages[0]?.html).toContain("Heading");
  });

  it("rejects front matter when disallowFrontMatter is true", async () => {
    await write("docs/index.md", "---\ntitle: Old Style\n---\n# Heading\n");
    const config = configFor(dir, { validation: { disallowFrontMatter: true } });
    await expect(buildPagesForTest(config)).rejects.toMatchObject({
      code: "front-matter-not-supported",
    });
  });

  it("rejects nested front matter fields (spec extension: flat only)", async () => {
    await write("docs/index.md", "---\nnavigation:\n  title: Custom\n---\n# Heading\n");
    await expect(buildPagesForTest(configFor(dir))).rejects.toMatchObject({
      code: "front-matter-too-deep",
    });
  });

  it("rejects a page that defines both front matter and .meta.ts", async () => {
    await write("docs/index.md", "---\ntitle: Old Style\n---\n# Heading\n");
    await writeMeta("docs/index.md", { title: "New Style" });
    await expect(buildPagesForTest(configFor(dir))).rejects.toMatchObject({
      code: "front-matter-conflicts-with-metadata",
    });
  });

  it("throws MakitError('duplicate-route') when two files produce the same route", async () => {
    await write("docs/guides.md", "content a");
    await write("docs/guides/index.md", "content b");
    await expect(buildPagesForTest(configFor(dir))).rejects.toMatchObject({
      code: "duplicate-route",
    });
  });

  it("throws MakitError('duplicate-page-id') when two files share an explicit id", async () => {
    await write("docs/a.md", "content");
    await writeMeta("docs/a.md", { id: "same" });
    await write("docs/b.md", "content");
    await writeMeta("docs/b.md", { id: "same" });
    try {
      await buildPagesForTest(configFor(dir));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(MakitError);
      expect((error as MakitError).code).toBe("duplicate-page-id");
    }
  });

  it("surfaces metadata loader errors for invalid .meta.ts files", async () => {
    await write("docs/index.md", "content");
    await write("docs/index.meta.ts", "export default { title: 'no define fn' };");
    await expect(buildPagesForTest(configFor(dir))).rejects.toMatchObject({
      code: "metadata-wrong-define-function",
    });
  });

  it("collects per-page warnings with the source file path prefixed", async () => {
    await write("docs/index.md", "```not-a-lang\ncode\n```\n");
    const { warnings } = await buildPagesForTest(configFor(dir));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("index.md");
    expect(warnings[0]).toContain("not-a-lang");
  });
});
