# Content structure

As a site grows, use directories and filenames to create a readable order.

## Recommended layout

```text
docs/
├── index.md
├── 01-getting-started/
│   ├── 01-installation.md
│   └── 02-configuration.md
├── 02-guides/
│   ├── 01-internationalization.md
│   └── 02-deployment.md
└── 03-reference/
    └── cli.md
```

Numeric prefixes only determine sidebar order and are removed from URLs. Files without a prefix are placed last within the same directory by default.

## Control page titles

The first Markdown heading becomes the page title. Add metadata to use a different title for search results or navigation.

```ts
import { definePageMetadata } from "@natsuneko-laboratory/makit/metadata";

export default definePageMetadata({
  id: "installation",
  title: "Installation",
  description: "Add Makit to a project.",
});
```

## When to use collections

Use collections when a single portal contains several products or services. Every collection can have its own home page, URL prefix, and navigation.

```text
docs/
├── makit/
│   ├── collection.makit.ts
│   └── index.md
└── enduroq/
    ├── collection.makit.ts
    └── index.md
```

You do not need collections from the beginning. Introduce them when the site becomes large enough to benefit from them.
