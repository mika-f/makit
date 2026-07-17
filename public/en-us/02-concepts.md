# Core concepts

Makit is centered on Markdown files, with TypeScript metadata added only where it is useful.

## Markdown is for content

Write headings, paragraphs, lists, and code blocks—the content readers see—in Markdown. To add a page, simply create an `.md` file.

```markdown
# Configuration

Configure Makit in `makit.config.ts`.
```

## TypeScript is for structure

To explicitly set a page title or ID, place a `{page-name}.meta.ts` file next to it.

```ts
import { definePageMetadata } from "@natsuneko-laboratory/makit/metadata";

export default definePageMetadata({
  id: "configuration",
  title: "Configuration",
});
```

TypeScript gives you editor completion and type checking, without maintaining a separate YAML structure file.

## Code-block annotations

Enable `markdown.code.lineNumbers` in `makit.config.ts` to show line numbers for every code block. To enable them for one block, add `lineNumbers` after its filename.

````markdown
```typescript src/config.ts lineNumbers
export const enabled = true;
```
````

Add an annotation at the end of a line to highlight it or render it as a Git-style diff. The annotation itself is not shown.

````markdown
```typescript
const changed = true; // [!code highlight]
const added = true; // [!code ++]
const removed = false; // [!code --]
```
````

## GitHub-style alerts

Use GitHub's alert syntax to call attention to important content. Makit supports `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, and `CAUTION`; each has a distinct, accessible visual treatment.

```markdown
> [!IMPORTANT]
> Read the [security guide](/security-guides) before installing or using this add-on.
```

## Site hierarchy

Think of a site as the following hierarchy:

```text
Site
└── Collection
    └── Section
        └── Group
            └── Page
```

You do not need every level. A small site can work with pages directly under the site root.

## URLs and sidebars are independent

Filename prefixes such as `01-` and `02-` primarily control display order. They are not included in URLs.

```text
docs/02-guides/01-installation.md
```

The file above becomes:

```text
/guides/installation/
```

You can reorganize the display order without changing URLs or page IDs.
