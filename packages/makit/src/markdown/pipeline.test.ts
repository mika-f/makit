import { describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import type { MakitConfigParsed } from "../config/schema.js";
import { MakitError } from "../core/errors.js";
import type { ResolvedConfig } from "../types/resolved-config.js";
import { createMarkdownProcessor, processMarkdown } from "./pipeline.js";

const ctx = { root: "/project", configPath: "/project/makit.config.ts" };

function makeConfig(overrides: MakitConfigParsed = { title: "Test" }): ResolvedConfig {
  return resolveConfig(overrides, ctx);
}

async function render(markdown: string, config = makeConfig(), currentRelativePath = "index.md") {
  const processor = createMarkdownProcessor(config);
  return processMarkdown(processor, markdown, config, { currentRelativePath });
}

describe("createMarkdownProcessor / processMarkdown", () => {
  it("renders headings with slugged, deduplicated ids", async () => {
    const result = await render("# Hello World\n\n## Hello World\n");
    expect(result.headings).toEqual([
      { id: "hello-world", depth: 1, text: "Hello World" },
      { id: "hello-world-1", depth: 2, text: "Hello World" },
    ]);
    expect(result.html).toContain('id="hello-world"');
    expect(result.html).toContain('id="hello-world-1"');
  });

  it("supports GFM: strikethrough, tables, task lists, footnotes", async () => {
    const result = await render(
      "~~gone~~\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n- [x] done\n\nRef[^1].\n\n[^1]: note\n",
    );
    expect(result.html).toContain("<del>gone</del>");
    expect(result.html).toContain("<table>");
    expect(result.html).toContain('type="checkbox" checked disabled');
    expect(result.html).toContain("data-footnote-ref");
  });

  it("preserves GFM table column alignment", async () => {
    const result = await render(
      "| Left | Center | Right |\n| :--- | :----: | ----: |\n| a | b | c |\n",
    );

    expect(result.html).toMatch(/<th style="text-align:\s*left">Left<\/th>/);
    expect(result.html).toMatch(/<th style="text-align:\s*center">Center<\/th>/);
    expect(result.html).toMatch(/<th style="text-align:\s*right">Right<\/th>/);
    expect(result.html).toMatch(/<td style="text-align:\s*left">a<\/td>/);
    expect(result.html).toMatch(/<td style="text-align:\s*center">b<\/td>/);
    expect(result.html).toMatch(/<td style="text-align:\s*right">c<\/td>/);
  });

  it("wraps tables in a scrollable container", async () => {
    const result = await render("| a | b |\n| - | - |\n| 1 | 2 |\n");

    expect(result.html).toContain('<div class="makit-table-wrapper"><table>');
  });

  it.each(["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"])(
    "renders GitHub %s alerts as labelled asides",
    async (type) => {
      const result = await render(`> [!${type}]\n> Read this carefully.\n`);
      const normalizedType = type.toLowerCase();
      expect(result.html).toContain(`<aside class="makit-alert makit-alert-${normalizedType}"`);
      expect(result.html).toContain(`<p class="makit-alert-title">${normalizedType}</p>`);
      expect(result.html).toContain("Read this carefully.");
      expect(result.html).not.toContain(`[!${type}]`);
    },
  );

  it("keeps ordinary blockquotes unchanged", async () => {
    const result = await render("> A normal quotation.\n");
    expect(result.html).toContain("<blockquote>");
    expect(result.html).not.toContain("makit-alert");
  });

  it("adds target/rel to external links using markdown.externalLinks config", async () => {
    const result = await render("[external](https://example.com)");
    expect(result.html).toContain('target="_blank"');
    expect(result.html).toContain('rel="noopener noreferrer"');
    expect(result.html).toContain('class="makit-external-link-icon"');
    expect(result.html).toMatch(/external<svg[^>]*makit-external-link-icon/);
  });

  it("does not touch root-relative or anchor-only links", async () => {
    const result = await render("[a](/already/absolute/) [b](#anchor)");
    expect(result.html).toContain('href="/already/absolute/"');
    expect(result.html).toContain('href="#anchor"');
    expect(result.html).not.toContain("makit-external-link-icon");
  });

  it("rewrites relative markdown links into routes", async () => {
    const result = await render(
      "[Configuration](./guides/configuration.md)",
      makeConfig(),
      "index.md",
    );
    expect(result.html).toContain('href="/guides/configuration/"');
  });

  it("rewrites relative markdown links from a nested file relative to its own directory", async () => {
    const result = await render("[Sibling](./other.md)", makeConfig(), "guides/configuration.md");
    expect(result.html).toContain('href="/guides/other/"');
  });

  it("strips numeric ordering prefixes when rewriting links (ORDER-PREFIX §21)", async () => {
    const result = await render("[Installation](./01-installation.md)", makeConfig(), "index.md");
    expect(result.html).toContain('href="/installation/"');
  });

  it("resolves a prefix-less link the same as its prefixed physical path (ORDER-PREFIX §21)", async () => {
    const withPrefix = await render(
      "[Installation](./01-installation.md)",
      makeConfig(),
      "index.md",
    );
    const withoutPrefix = await render(
      "[Installation](./installation.md)",
      makeConfig(),
      "index.md",
    );
    expect(withoutPrefix.html).toContain(
      withPrefix.html.match(/href="[^"]+"/)?.[0] ?? "href=UNMATCHED",
    );
  });

  it("keeps the prefix literal in rewritten links when numericPrefixes is disabled", async () => {
    const config = makeConfig({
      title: "Test",
      navigation: { auto: { numericPrefixes: false } },
    });
    const processor = createMarkdownProcessor(config);
    const result = await processMarkdown(
      processor,
      "[Installation](./01-installation.md)",
      config,
      { currentRelativePath: "index.md" },
    );
    expect(result.html).toContain('href="/01-installation/"');
  });

  it("omits a route group when rewriting links to a page inside it (ROUTE-GROUPS §4)", async () => {
    const result = await render("[About](./(marketing)/about.md)", makeConfig(), "index.md");
    expect(result.html).toContain('href="/about/"');
  });

  it("resolves a link from inside a route group to a sibling outside it", async () => {
    const result = await render(
      "[Home](../index.md)",
      makeConfig(),
      "(marketing)/about.md",
    );
    expect(result.html).toContain('href="/"');
  });

  it("keeps the route group literal in rewritten links when routeGroups is disabled", async () => {
    const config = makeConfig({
      title: "Test",
      navigation: { auto: { routeGroups: false } },
    });
    const processor = createMarkdownProcessor(config);
    const result = await processMarkdown(
      processor,
      "[About](./(marketing)/about.md)",
      config,
      { currentRelativePath: "index.md" },
    );
    expect(result.html).toContain('href="/(marketing)/about/"');
  });

  it("prefixes rewritten links with the locale when i18n is enabled", async () => {
    const config = makeConfig({
      title: "Test",
      i18n: { defaultLocale: "en-US", locales: [{ locale: "en-US" }, { locale: "ja-JP" }] },
    });
    const processor = createMarkdownProcessor(config);
    const result = await processMarkdown(
      processor,
      "[Configuration](./guides/configuration.md)",
      config,
      {
        currentRelativePath: "index.md",
        localePrefix: "ja-jp",
      },
    );
    expect(result.html).toContain('href="/ja-jp/guides/configuration/"');
  });

  it("prefixes rewritten links with the collection's URL path (spec §28.1)", async () => {
    const config = makeConfig();
    const processor = createMarkdownProcessor(config);
    const result = await processMarkdown(
      processor,
      "[Configuration](./guides/configuration.md)",
      config,
      {
        currentRelativePath: "index.md",
        collectionSegments: ["makit"],
      },
    );
    expect(result.html).toContain('href="/makit/guides/configuration/"');
  });

  it("combines the locale prefix and the collection's URL path", async () => {
    const config = makeConfig({
      title: "Test",
      i18n: { defaultLocale: "en-US", locales: [{ locale: "en-US" }, { locale: "ja-JP" }] },
    });
    const processor = createMarkdownProcessor(config);
    const result = await processMarkdown(
      processor,
      "[Configuration](./guides/configuration.md)",
      config,
      {
        currentRelativePath: "index.md",
        localePrefix: "ja-jp",
        collectionSegments: ["makit"],
      },
    );
    expect(result.html).toContain('href="/ja-jp/makit/guides/configuration/"');
  });

  it("leaves links that escape the sourceDir root untouched", async () => {
    const result = await render("[bad](../outside.md)");
    expect(result.html).toContain('href="../outside.md"');
  });

  it("highlights known languages with Shiki", async () => {
    const result = await render("```typescript\nconst x: number = 1;\n```\n");
    expect(result.html).toContain("shiki");
    expect(result.html).toContain('data-language="typescript"');
    expect(result.html).toContain('data-label="typescript"');
    expect(result.html).toContain("const");
  });

  it("renders a filename from fenced code metadata", async () => {
    const result = await render("```csharp TextFile.cs\nvar text = File.ReadAllText(path);\n```\n");
    expect(result.html).toContain('data-language="csharp"');
    expect(result.html).toContain('data-filename="TextFile.cs"');
    expect(result.html).toContain('data-label="TextFile.cs"');
  });

  it("supports quoted and title-style filenames", async () => {
    const quoted = await render('```typescript "hello world.ts"\nexport {};\n```\n');
    expect(quoted.html).toContain('data-filename="hello world.ts"');

    const titled = await render('```typescript title="src/index.ts"\nexport {};\n```\n');
    expect(titled.html).toContain('data-filename="src/index.ts"');
  });

  it("enables line numbers globally and per fenced-code metadata", async () => {
    const global = await render(
      "```typescript\nconst x = 1;\n```\n",
      makeConfig({ title: "Test", markdown: { code: { lineNumbers: true } } }),
    );
    expect(global.html).toMatch(/class="[^"]*has-line-numbers/);
    expect(global.html.match(/<pre\b[^>]*>/)?.[0].match(/\sclass=/g)).toHaveLength(1);

    const local = await render("```typescript example.ts lineNumbers\nconst x = 1;\n```\n");
    expect(local.html).toContain('data-filename="example.ts"');
    expect(local.html).toMatch(/class="[^"]*has-line-numbers/);
  });

  it("renders code annotations as line classes and removes their markers", async () => {
    const result = await render(
      "```typescript\nconst a = 1; // [!code highlight]\nconst b = 2; // [!code ++]\nconst c = 3; // [!code --]\n```\n",
    );
    expect(result.html).toContain('class="line highlighted"');
    expect(result.html).toContain('class="line diff add"');
    expect(result.html).toContain('class="line diff remove"');
    expect(result.html).not.toContain("[!code");
  });

  it("keeps annotations literal in Markdown code examples", async () => {
    const result = await render(
      "````markdown\n```typescript\nconst changed = true; // [!code highlight]\n```\n````\n",
    );
    expect(result.html).toContain("[!code highlight]");
    expect(result.html).not.toContain('class="line highlighted"');
  });

  it("downgrades an unknown language to plain text with a warning by default", async () => {
    const result = await render("```not-a-real-language\nhello\n```\n");
    expect(result.html).toContain("shiki");
    expect(result.html).toContain('data-language="text"');
    expect(result.html).toContain('data-label="text"');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("not-a-real-language");
  });

  it("throws on an unknown language when unknownLanguage is 'error'", async () => {
    const config = makeConfig({ title: "Test", markdown: { shiki: { unknownLanguage: "error" } } });
    await expect(render("```not-a-real-language\nhello\n```\n", config)).rejects.toThrow(
      MakitError,
    );
  });

  it("strips raw HTML by default (allowDangerousHtml: false)", async () => {
    const result = await render("<div>raw</div>\n\nplain text");
    expect(result.html).not.toContain("<div>raw</div>");
  });

  it("parses raw HTML when allowDangerousHtml is enabled", async () => {
    const config = makeConfig({ title: "Test", markdown: { allowDangerousHtml: true } });
    const result = await render("<div>raw</div>", config);
    expect(result.html).toContain("<div>raw</div>");
  });

  it("applies user-supplied remark and rehype plugins", async () => {
    let remarkRan = false;
    let rehypeRan = false;
    const remarkPlugin = () => (tree: unknown) => {
      remarkRan = true;
      return tree;
    };
    const rehypePlugin = () => (tree: unknown) => {
      rehypeRan = true;
      return tree;
    };
    const config = makeConfig({
      title: "Test",
      markdown: { remarkPlugins: [remarkPlugin], rehypePlugins: [rehypePlugin] },
    });
    await render("hello", config);
    expect(remarkRan).toBe(true);
    expect(rehypeRan).toBe(true);
  });
});
