# Metadata API

Place TypeScript files alongside Markdown to define page and navigation information with type safety.

## Page metadata

```ts
import { definePageMetadata } from "@natsuneko-laboratory/makit/metadata";

export default definePageMetadata({
  id: "guides.configuration",
  title: "Configuration",
  description: "Configure the entire site.",
  order: 1,
});
```

The main properties are:

- `id`: a stable identifier for translations and links
- `title`: a title used in navigation and page headings
- `description`: a description for SEO and summary displays
- `slug`: an explicit URL path segment
- `order`: display order among siblings; it takes precedence over filename prefixes

## Collections

```ts
import { defineCollection } from "@natsuneko-laboratory/makit/metadata";

export default defineCollection({
  id: "makit",
  title: "Makit",
  description: "Makit documentation",
  path: "/makit",
});
```

## Automatic and manual navigation

Without special configuration, Makit generates navigation from the file structure. For detailed control in a large site, define it explicitly with `navigation.makit.ts` and `defineNavigation`.
