import { describe, expect, it } from "vitest";
import rehypeParse from "rehype-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { resolveConfig } from "../config/normalize.js";
import { createMarkdownProcessor, processMarkdown } from "./pipeline.js";

const config = resolveConfig(
  { title: "Test" },
  { root: "/project", configPath: "/project/makit.config.ts" },
);
const context = { currentRelativePath: "guides/index.md" };

function render(source: string) {
  return processMarkdown(createMarkdownProcessor(config), source, config, context);
}

const toggle = `:::toggle[Installation]{open}

## Setup

Use **Markdown** and [configuration](./configuration.md).

| Name | Value |
| --- | --- |
| package | makit |

> [!NOTE]
> A useful hint.

\`\`\`sh
pnpm add makit
\`\`\`

:::`;

const accordion = `::::accordion[FAQ]
:::toggle[First]{open}

First answer.

:::
:::toggle[Second]

Second answer.

:::
::::`;

describe("Markdown disclosures", () => {
  it("renders a labelled native toggle and processes its Markdown body with raw HTML disabled", async () => {
    const { html, headings, warnings } = await render(toggle);
    expect(html).toContain('<details class="makit-toggle" data-makit-toggle="" open>');
    expect(html).toContain('<summary class="makit-toggle-summary">Installation</summary>');
    expect(html).toContain('<div class="makit-toggle-body">');
    expect(html).toContain("<strong>Markdown</strong>");
    expect(html).toContain('href="/guides/configuration/"');
    expect(html).toContain('class="makit-table-wrapper"');
    expect(html).toContain('class="makit-alert makit-alert-note"');
    expect(html).toContain('data-language="sh"');
    expect(html).not.toContain(":::");
    expect(html).not.toContain("name=");
    expect(headings).toEqual([{ id: "setup", depth: 2, text: "Setup" }]);
    expect(warnings).toEqual([]);
  });

  it("defaults to closed and accepts explicit boolean false", async () => {
    const { html } = await render(
      toggle.replace("{open}", "") + "\n\n" + toggle.replace("{open}", '{open="false"}'),
    );
    expect(html.match(/<details /g)).toHaveLength(2);
    expect(html).not.toContain(" open");
  });

  it("groups only the direct items into an exclusive accordion", async () => {
    const { html, warnings } = await render(accordion);
    expect(html).toContain('class="makit-accordion" role="group" aria-label="FAQ"');
    expect(html.match(/name="makit-accordion-1"/g)).toHaveLength(2);
    expect(html.match(/ open/g)).toHaveLength(1);
    expect(warnings).toEqual([]);
  });

  it("supports multiple initially open items when multiple is enabled", async () => {
    const { html, warnings } = await render(
      accordion.replace("[FAQ]", "[FAQ]{multiple}").replace("[Second]", "[Second]{open}"),
    );
    expect(html).not.toContain("name=");
    expect(html.match(/ open/g)).toHaveLength(2);
    expect(warnings).toEqual([]);
  });

  it("warns about conflicting initial states and keeps the first open item", async () => {
    const { html, warnings } = await render(accordion.replace("[Second]", "[Second]{open}"));
    expect(html.match(/ open/g)).toHaveLength(1);
    expect(html).toContain(
      'data-makit-toggle="" open name="makit-accordion-1"><summary class="makit-toggle-summary">First',
    );
    expect(warnings).toHaveLength(1);
  });

  it("gives separate and nested accordions distinct names and leaves nested standalone toggles independent", async () => {
    const nested = `::::::accordion
:::::toggle[Outer]
${accordion}

${toggle}
:::::
::::::`;
    const { html, warnings } = await render(nested + "\n\n" + accordion);
    expect(html.match(/name="makit-accordion-1"/g)).toHaveLength(1);
    expect(html.match(/name="makit-accordion-2"/g)).toHaveLength(2);
    expect(html.match(/name="makit-accordion-3"/g)).toHaveLength(2);
    expect(html.match(/<details /g)).toHaveLength(6);
    expect(html).toContain('aria-label="Accordion"');
    expect(warnings).toEqual([]);
  });

  it("supports tabs inside toggles and toggles inside tabs", async () => {
    const tabs = `::::tabs
:::tab[One]
First tab.
:::
:::tab[Two]
Second tab.
:::
::::`;
    const { html, warnings } = await render(`:::::toggle[Outer]
${tabs}
:::::

:::::tabs
::::tab[Outer tab]
${toggle}
::::
:::::`);
    expect(html.match(/data-makit-tabs=""/g)).toHaveLength(2);
    expect(html.match(/data-makit-toggle=""/g)).toHaveLength(2);
    expect(warnings).toEqual([]);
  });

  it("supports containers in blockquotes", async () => {
    const { html, warnings } = await render(
      accordion
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n"),
    );
    expect(html).toContain("<blockquote>");
    expect(html.match(/<details /g)).toHaveLength(2);
    expect(warnings).toEqual([]);
  });

  it("resets group names across files processed with the same processor", async () => {
    const processor = createMarkdownProcessor(config);
    const first = await processMarkdown(processor, accordion, config, context);
    const second = await processMarkdown(processor, accordion, config, context);
    expect(second.html).toBe(first.html);
  });

  it.each(["`:::toggle[Label]`", `\`\`\`\`markdown\n${accordion}\n\`\`\`\``])(
    "keeps code samples literal",
    async (source) => {
      const { html, warnings } = await render(source);
      expect(html).not.toContain("<details");
      expect(warnings).toEqual([]);
    },
  );

  it("escapes labels and ignores user-supplied HTML attributes", async () => {
    const { html } = await render(
      '::::accordion[<img src=x onerror=bad()>]{onclick="bad()"}\n:::toggle[<img src=x onerror=bad()> & "quoted"]{onclick="bad()" name="injected"}\n\nSafe.\n\n:::\n::::',
    );
    const tree = unified().use(rehypeParse, { fragment: true }).parse(html);
    visit(tree, "element", (node) => {
      expect(node.tagName).not.toBe("img");
      expect(node.properties).not.toHaveProperty("onClick");
      expect(node.properties).not.toHaveProperty("onError");
    });
    expect(html).not.toContain('onclick="');
    expect(html).not.toContain('name="injected"');
    expect(html).toContain("&#x3C;img");
    expect(html).toContain("Safe.");
  });

  it.each([
    ":::toggle\n\nKeep **this**.\n\n:::",
    ":::toggle[ ]\n\nKeep **this**.\n\n:::",
    ":::accordion\n\nKeep **this**.\n\n:::",
    "::::accordion\n:::toggle\n\nKeep **this**.\n\n:::\n::::",
    ":::accordion\n:::",
  ])(
    "warns about malformed containers while retaining ordinary Markdown content",
    async (source) => {
      const { html, warnings } = await render(source);
      expect(html).not.toContain("<details");
      expect(html).not.toContain('class="makit-accordion"');
      if (source.includes("Keep")) expect(html).toContain("Keep <strong>this</strong>.");
      expect(warnings).toHaveLength(1);
    },
  );
});
