# Markdown syntax

Makit renders Markdown as page content and enables GitHub Flavored Markdown by default. This page pairs each source form with its rendered result.

## Headings, paragraphs, and links

```markdown
# Page title

Separate paragraphs with a blank line. Use **emphasis**, `inline code`, and [links](https://github.com/mika-f/makit).

## A section
```

Rendered result:

# Page title

Separate paragraphs with a blank line. Use **emphasis**, `inline code`, and [links](https://github.com/mika-f/makit).

## A section

The first H1 becomes the page title unless metadata supplies `title`. Headings receive IDs, and the table of contents includes H2–H3 by default.

## Lists and quotations

```markdown
- An unordered item
- Another item

1. First step
2. Next step

> A quotation can provide context or cite a source.

- [x] Complete
- [ ] Not yet complete
```

Rendered result:

- An unordered item
- Another item

1. First step
2. Next step

> A quotation can provide context or cite a source.

- [x] Complete
- [ ] Not yet complete

## Code blocks

Give a fence a language to enable syntax highlighting. The filename and `lineNumbers` attributes enrich the display.

````markdown
```ts src/makit.config.ts lineNumbers
export default { title: "My Documentation" };
```
````

Rendered result:

```ts src/makit.config.ts lineNumbers
export default { title: "My Documentation" };
```

Code annotations highlight change states without rendering the annotation itself.

````markdown
```ts
const changed = true; // [!code highlight]
const added = true; // [!code ++]
const removed = false; // [!code --]
```
````

Rendered result:

```ts
const changed = true; // [!code highlight]
const added = true; // [!code ++]
const removed = false; // [!code --]
```

In `markdown`, `md`, and `mdx` fences, annotations remain visible as example text.

## Tabs

Switch between installation methods or OS-specific instructions in an ordinary `.md` file. No MDX, component imports, or extra configuration is required.

Create a group with `::::tabs` and add `:::tab[Label]` containers inside it. Write each body without indentation. Tabs support ordinary Markdown, including paragraphs, lists, tables, images, alerts, and code blocks.

````markdown
::::tabs[Package manager]{default="pnpm"}
:::tab[npm]

```sh
npm install -D @natsuneko-laboratory/makit
```

:::
:::tab[pnpm]

```sh
pnpm add -D @natsuneko-laboratory/makit
```

:::
::::
````

Rendered result:

::::tabs[Package manager]{default="pnpm"}
:::tab[npm]

```sh
npm install -D @natsuneko-laboratory/makit
```

:::
:::tab[pnpm]

```sh
pnpm add -D @natsuneko-laboratory/makit
```

:::
::::

- The group's `[Package manager]` label names the tab list for assistive technology. It defaults to `Tabs`.
- `{default="pnpm"}` selects the initial tab by label. Without it, the first tab is selected. An unknown label produces a warning and selects the first tab.
- Click a tab or focus it and use Left/Right Arrow, Home, or End to switch.
- Groups operate independently. Opening a heading anchor reveals the tab containing that heading.
- Without JavaScript, and when printing, all labels and panel contents remain readable.

Do not add a space between `:` and `tabs` or `tab`. The outer fence must have more colons than the inner fences. Nested groups work the same way: increase the fence length for each enclosing container.

```markdown
::::::tabs
:::::tab[macOS]

::::tabs
:::tab[Apple Silicon]

Instructions for Apple Silicon.

:::
:::tab[Intel]

Instructions for Intel.

:::
::::

:::::
:::::tab[Windows]

Instructions for Windows.

:::::
::::::
```

A group must contain only labelled `tab` containers as direct children. Empty groups, missing labels, and orphan tabs produce warnings and retain their content as ordinary Markdown. Tab syntax inside code fences remains literal.

The syntax takes its container structure from the [VitePress tabs plugin](https://github.com/Red-Asuka/vitepress-plugin-tabs#usage) and uses [Markdown directive](https://github.com/remarkjs/remark-directive) labels and attributes to fit Makit's Remark pipeline. Unlike [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/reference/content-tabs/)'s `=== "Label"` syntax, tab bodies need no indentation.

## Toggles and accordions

Use `:::toggle[Title]` to collapse supplementary content or answers to frequently asked questions. Bodies need no indentation and support ordinary Markdown, including paragraphs, lists, tables, alerts, and code blocks. No MDX or extra configuration is required.

````markdown
:::toggle[Installation instructions]{open}

Install with **pnpm**.

```sh
pnpm add -D @natsuneko-laboratory/makit
```

:::
````

Rendered result:

:::toggle[Installation instructions]{open}

Install with **pnpm**.

```sh
pnpm add -D @natsuneko-laboratory/makit
```

:::

Wrap several toggles in `::::accordion` to allow only one item to be open at a time.

```markdown
::::accordion[Frequently asked questions]
:::toggle[Do I need MDX?]

An ordinary `.md` file is enough.

:::
:::toggle[What can I put in the body?]

Use Markdown lists, tables, code blocks, and more.

:::
::::
```

Rendered result:

::::accordion[Frequently asked questions]
:::toggle[Do I need MDX?]

An ordinary `.md` file is enough.

:::
:::toggle[What can I put in the body?]

Use Markdown lists, tables, code blocks, and more.

:::
::::

- Each toggle requires a `[Title]`, displayed as plain text. Click it, or focus it and press Enter or Space, to expand or collapse the body.
- Add `{open}` to expand an item initially. Without it, or with `{open="false"}`, the item starts closed. If an exclusive group has several initially open items, Makit warns and keeps only the first requested item open.
- Use `::::accordion[Frequently asked questions]{multiple}` to allow multiple open items. The optional group label names the group for assistive technology and defaults to `Accordion`.
- Groups operate independently. Toggles can be nested and combined with tabs. Increase the number of colons for each enclosing container.
- Native HTML `details` / `summary` controls work even without JavaScript. With JavaScript enabled, opening a heading anchor reveals its enclosing toggles. Printing expands all bodies and restores their previous state afterward.

An accordion must contain only labelled `toggle` containers as direct children. Empty groups, missing toggle labels, and groups mixed with ordinary paragraphs produce warnings and retain their syntax and content as ordinary Markdown. Syntax inside code fences remains literal.

## GitHub-style alerts

```markdown
> [!WARNING]
> Run `makit check` before publishing a production site.
```

Rendered result:

> [!WARNING]
> Run `makit check` before publishing a production site.

Use `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, or `CAUTION` to signal severity.

## Tables

```markdown
| Setting   | Meaning    |
| --------- | ---------- |
| `title`   | Site name  |
| `siteUrl` | Public URL |
```

Rendered result:

| Setting   | Meaning    |
| --------- | ---------- |
| `title`   | Site name  |
| `siteUrl` | Public URL |

Use colons in the separator row to align each column. A colon on the left,
both sides, or right aligns the column left, center, or right respectively.

```markdown
| Left | Center | Right |
| :--- | :----: | ----: |
| a    |   b    |     c |
```

Rendered result:

| Left | Center | Right |
| :--- | :----: | ----: |
| a    |   b    |     c |

Raw HTML is disabled by default. Configure HTML, Shiki, external links, plugins, and the table-of-contents range in the [configuration reference](../04-reference/02-configuration.md#markdown).
