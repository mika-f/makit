# Metadata API

Place TypeScript files alongside Markdown to define page and navigation information with type safety.

## Page metadata

```ts
import { definePageMetadata } from "@natsuneko-laboratory/makit/metadata";

export default definePageMetadata({
  id: "guides.configuration",
  title: "Configuration",
  description: "Configure the entire site.",
  slug: "config",
  order: 1,
  image: "/og/config.png",
});
```

Put this in a same-named file such as `configuration.meta.ts`. When metadata is omitted, Makit derives values from the first H1 and filename.

| Property                      | Description                                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `id`                          | A stable identifier for translations, manual navigation, and links. It must be unique within a locale and collection. |
| `title` / `description`       | Text used for navigation, the HTML title, and summary displays.                                                       |
| `slug`                        | Overrides the final URL name. A string is one segment; an array of strings creates multiple segments.                 |
| `order`                       | Automatic-navigation order. Lower values appear first and take priority over numeric filename prefixes.               |
| `draft`                       | Available in development but omitted from production builds.                                                          |
| `hidden`                      | Builds the page but omits it from navigation.                                                                         |
| `sidebar` / `tableOfContents` | Whether this page shows its sidebar or in-page table of contents; both default to `true`.                             |
| `layout`                      | Layout name for the page.                                                                                             |
| `canonical` / `image`         | Canonical URL and page-specific Open Graph image.                                                                     |

Lightweight YAML front matter is an alternative for flat overrides. It cannot express nested values or coexist with non-empty front matter and a `.meta.ts` file; use `.meta.ts` for complex or type-checked metadata.

## Collections

```ts
import { defineCollection } from "@natsuneko-laboratory/makit/metadata";

export default defineCollection({
  id: "makit",
  title: "Makit",
  description: "Makit documentation",
  path: "/makit",
  icon: "/makit.svg",
  seo: { image: "/og/makit.png" },
});
```

Put Collection metadata in `collection.makit.ts`. Its `id` identifies the same product across locales. `path` is the URL prefix, `index` selects the Collection home Markdown (default `index.md`), and `hidden` removes it from the portal and switcher. `title` and `description` may be locale-keyed string objects.

## Categories

Use `category.makit.ts` in a directory to customize its automatic-navigation section or group.

```ts
import { defineCategory } from "@natsuneko-laboratory/makit/metadata";

export default defineCategory({
  title: "Guides",
  type: "section",
  order: 2,
  collapsible: true,
  index: "index.md",
});
```

`type` defaults to `section`; `order` controls position; `hidden` hides the subtree; `collapsible` and `collapsed` control folding. Set `index` to make the category clickable.

A `category.makit.ts` inside a [route group](../03-guides/content-structure.md#route-groups) directory still applies under the default `navigation.auto.routeGroups: "url"`. Under `"flatten"`, the group has no section of its own to attach to, so the file is ignored with a `route-group-category-ignored` warning.

## Manual navigation

Without special configuration, Makit generates navigation from the file structure. For detailed control, put `navigation.makit.ts` at a Collection root.

```ts
import { defineNavigation } from "@natsuneko-laboratory/makit/metadata";

export default defineNavigation({
  items: [
    { type: "page", page: "getting-started" },
    {
      type: "section",
      title: "Guides",
      collapsible: true,
      items: [
        { type: "page", page: "guides.configuration" },
        { type: "link", title: "GitHub", href: "https://github.com/mika-f/makit", external: true },
      ],
    },
  ],
});
```

Nodes can be `page` (by page ID), `section` or `group` (with children), `link` (an arbitrary URL), or `collection` (another Collection's top page). A `page` can override `title` or set `hidden`; sections and groups also support `id`, `collapsible`, and `collapsed`.
