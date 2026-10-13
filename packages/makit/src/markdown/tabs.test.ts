import { describe, expect, it } from "vitest";
import { resolveConfig } from "../config/normalize.js";
import type { MakitConfigParsed } from "../config/schema.js";
import { createMarkdownProcessor, processMarkdown } from "./pipeline.js";

const example = `::::tabs[Package manager]
:::tab[npm]

Install with **npm**.

\`\`\`sh
npm install makit
\`\`\`

:::
:::tab[pnpm]

## pnpm setup

[Configuration](./configuration.md)

| Name | Value |
| --- | --- |
| package | makit |

> [!NOTE]
> Choose one manager.

:::
::::`;

async function render(source: string, overrides: MakitConfigParsed = { title: "Test" }) {
  const config = resolveConfig(overrides, {
    root: "/project",
    configPath: "/project/makit.config.ts",
  });
  return processMarkdown(createMarkdownProcessor(config), source, config, {
    currentRelativePath: "guides/index.md",
  });
}

describe("Markdown tabs", () => {
  it("renders labelled tabs and arbitrary Markdown with raw HTML disabled", async () => {
    const { html, headings, warnings } = await render(example);
    expect(html).toContain('class="makit-tabs" data-makit-tabs=""');
    expect(html).toContain('role="tablist" aria-label="Package manager"');
    expect(html).toContain(
      'id="makit-tabs-1-tab-1" aria-controls="makit-tabs-1-panel-1" aria-selected="true" tabindex="0"',
    );
    expect(html).toContain(
      'id="makit-tabs-1-tab-2" aria-controls="makit-tabs-1-panel-2" aria-selected="false" tabindex="-1"',
    );
    expect(html).toContain(
      'role="tabpanel" id="makit-tabs-1-panel-2" aria-labelledby="makit-tabs-1-tab-2"',
    );
    expect(html).toContain("<strong>npm</strong>");
    expect(html).toContain('data-language="sh"');
    expect(html).toContain('href="/guides/configuration/"');
    expect(html).toContain('class="makit-table-wrapper"');
    expect(html).toContain('class="makit-alert makit-alert-note"');
    expect(html).toContain('class="makit-tab-fallback-label">pnpm</p>');
    expect(html).not.toContain(" hidden");
    expect(html).not.toContain("::::");
    expect(headings).toEqual([{ id: "pnpm-setup", depth: 2, text: "pnpm setup" }]);
    expect(warnings).toEqual([]);
  });

  it("selects a default tab by its label", async () => {
    const { html } = await render(
      example.replace("[Package manager]", '[Package manager]{default="pnpm"}'),
    );
    expect(html).toContain(
      'id="makit-tabs-1-tab-2" aria-controls="makit-tabs-1-panel-2" aria-selected="true" tabindex="0"',
    );
  });

  it("warns and falls back when a default label is absent", async () => {
    const { html, warnings } = await render(
      example.replace("[Package manager]", '{default="yarn"}'),
    );
    expect(html).toContain('aria-label="Tabs"');
    expect(html).toContain(
      'id="makit-tabs-1-tab-1" aria-controls="makit-tabs-1-panel-1" aria-selected="true"',
    );
    expect(warnings).toEqual([
      'Tabs: default tab "yarn" does not match any label; using the first tab.',
    ]);
  });

  it("renders nested groups and keeps their IDs distinct", async () => {
    const { html, warnings } = await render(`::::::tabs
:::::tab[Outer]
${example}
:::::
::::::\n\n${example}`);
    expect(html.match(/data-makit-tabs=""/g)).toHaveLength(3);
    const ids = [...html.matchAll(/ id="(makit-tabs-[^"]+)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(warnings).toEqual([]);
  });

  it("supports tabs inside a blockquote", async () => {
    const { html, warnings } = await render(
      example
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n"),
    );
    expect(html).toContain("<blockquote>");
    expect(html).toContain('data-makit-tabs=""');
    expect(warnings).toEqual([]);
  });

  it("resets group IDs when the shared processor renders another file", async () => {
    const config = resolveConfig(
      { title: "Test" },
      { root: "/project", configPath: "/project/makit.config.ts" },
    );
    const processor = createMarkdownProcessor(config);
    const first = await processMarkdown(processor, example, config, {
      currentRelativePath: "index.md",
    });
    const second = await processMarkdown(processor, example, config, {
      currentRelativePath: "index.md",
    });
    expect(second.html).toBe(first.html);
  });

  it.each(["`::::tabs`", `\`\`\`\`markdown\n${example}\n\`\`\`\``])(
    "keeps tab syntax literal inside code",
    async (source) => {
      const { html } = await render(source);
      expect(html).not.toContain('data-makit-tabs=""');
      expect(html).toContain("::::tabs");
    },
  );

  it("escapes labels and ignores arbitrary HTML attributes", async () => {
    const { html } = await render(
      '::::tabs{onclick="bad()"}\n:::tab[<img src=x onerror=bad()> & "quoted"]{onclick="bad()"}\n\nSafe.\n\n:::\n::::',
    );
    expect(html).not.toContain("<img");
    expect(html).not.toContain('onclick="');
    expect(html).toContain("&#x3C;img");
    expect(html).toContain("Safe.");
  });

  it.each([
    ":::tab[Orphan]\n\nKeep this.\n\n:::",
    "::::tabs\n:::tab\n\nKeep this.\n\n:::\n::::",
    ":::tabs\n\nKeep this.\n\n:::",
    ":::tabs\n:::",
  ])("warns about malformed groups without discarding content", async (source) => {
    const { html, warnings } = await render(source);
    expect(html).not.toContain('data-makit-tabs=""');
    if (source.includes("Keep this.")) expect(html).toContain("Keep this.");
    expect(warnings).toHaveLength(1);
  });

  it("preserves unhandled directives as ordinary Markdown", async () => {
    const { html, warnings } = await render(
      ":example[**strong**]\n\n::example[label]\n\n:::example\n\n**Body**\n\n:::",
    );
    expect(html).toContain(":example[<strong>strong</strong>]");
    expect(html).toContain("::example[label]");
    expect(html).toContain(":::example");
    expect(html).toContain("<strong>Body</strong>");
    expect(warnings).toEqual([]);
  });

  it("allows user plugins to handle other directives", async () => {
    const plugin = () => (tree: { children: { data?: Record<string, unknown> }[] }) => {
      tree.children[0]!.data = { hName: "aside" };
    };
    const { html } = await render(":::note\n\nNote body.\n\n:::", {
      title: "Test",
      markdown: { remarkPlugins: [plugin] },
    });
    expect(html).toContain("<aside>");
    expect(html).toContain("Note body.");
  });
});
