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

Raw HTML is disabled by default. Configure HTML, Shiki, external links, plugins, and the table-of-contents range in the [configuration reference](../04-reference/configuration.md#markdown).
