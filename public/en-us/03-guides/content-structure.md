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

## Route groups

Wrap a directory name in parentheses — `(name)` — to organize files without adding a URL segment, similar to route groups in Next.js.

```text
docs/
├── index.md
├── (marketing)/
│   ├── about.md
│   └── pricing.md
└── (product)/
    └── overview.md
```

`docs/(marketing)/about.md` becomes `/about/`, not `/marketing/about/`. By default (`navigation.auto.routeGroups: "url"`), `(marketing)` and `(product)` still each form their own section in the sidebar. Set `routeGroups: "flatten"` to also drop that grouping and promote their pages straight into the parent level, or `false` to disable route groups entirely and treat `(name)` as a literal directory name.

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

## Use lightweight front matter

For simple page-level values, put YAML front matter at the start of the Markdown file. This is useful when a small page does not warrant a separate `.meta.ts` file.

```markdown
---
title: Installation
description: Add Makit to a project.
order: 1
---

# Install Makit

Makit requires Node.js 20 or later.
```

Front matter supports flat page metadata such as `id`, `title`, `description`, `slug`, `order`, `draft`, `hidden`, `sidebar`, `tableOfContents`, `layout`, `canonical`, `image`, `noindex`, and `nofollow`. `slug` may additionally be an array of strings for multiple URL segments.

It cannot represent nested configuration or arrays of objects. Unknown keys are ignored, and invalid or nested values are warned about and dropped. A page cannot combine non-empty front matter with a `.meta.ts` file. Prefer `.meta.ts` for complex metadata, type checking, or reusable values. Set `validation.disallowFrontMatter: true` to require metadata files instead.

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
