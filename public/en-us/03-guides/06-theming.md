# Theming

`theme` in `makit.config.ts` covers three levels of customization, from tokens to a complete replacement of the built-in components.

| Level               | How                                                                 | Use it for                                                           |
| ------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Tokens              | `theme.colorScheme`, `accentColor`, `radius`, `codeTheme`, `styles` | Colors, corner radius, extra CSS                                     |
| Component overrides | A `theme/` directory, or `theme.components`                         | Replacing the header, adding to the footer, a custom sidebar         |
| A whole theme       | `theme.extends`                                                     | Matching an existing design system, or a completely different layout |

The levels combine: you can start from a theme package and still replace individual components on top of it. Every level produces the same fully static output — no Node.js runtime is needed to serve the site.

## Replacing one component

Create `theme/header.tsx`. The file name is the component's name in kebab-case, and Makit picks it up with no configuration:

```tsx
// theme/header.tsx
import { Header as DefaultHeader } from "@natsuneko-laboratory/makit-runtime";
import type { HeaderProps } from "@natsuneko-laboratory/makit-runtime";

export default function Header(props: HeaderProps) {
  return (
    <>
      <div className="bg-amber-100 px-4 py-2 text-sm">Documentation for v2 is in beta.</div>
      <DefaultHeader {...props} />
    </>
  );
}
```

You do not need to add `react` or `next` to your project: Makit resolves them for you (see [Imports available to a component](#imports-available-to-a-component)).

`makit init --theme` scaffolds exactly this file for you.

### Component names

Each name maps to a file. Add `theme/<file>.tsx` to replace it.

| Component            | File                      | Replaces                                     |
| -------------------- | ------------------------- | -------------------------------------------- |
| `RootLayout`         | `root-layout.tsx`         | `<html>` and `<body>` — fonts, body classes  |
| `DocsPage`           | `docs-page.tsx`           | The whole page shell of a documentation page |
| `PortalHomePage`     | `portal-home-page.tsx`    | The portal-layout home page                  |
| `RootPage`           | `root-page.tsx`           | The `/` locale redirect or picker            |
| `NotFoundPage`       | `not-found-page.tsx`      | The 404 page                                 |
| `Header`             | `header.tsx`              | The site header                              |
| `Footer`             | `footer.tsx`              | The site footer                              |
| `Sidebar`            | `sidebar.tsx`             | The navigation sidebar                       |
| `NavigationItems`    | `navigation-items.tsx`    | The navigation tree inside the sidebar       |
| `Breadcrumbs`        | `breadcrumbs.tsx`         | The breadcrumb trail                         |
| `PageHeader`         | `page-header.tsx`         | A page's `<h1>` and description              |
| `PageContent`        | `page-content.tsx`        | The rendered Markdown body                   |
| `PrevNextLinks`      | `prev-next-links.tsx`     | The previous/next page links                 |
| `TableOfContents`    | `table-of-contents.tsx`   | The on-this-page outline                     |
| `PageActions`        | `page-actions.tsx`        | Edit / copy-as-Markdown actions              |
| `SearchDialog`       | `search-dialog.tsx`       | The search dialog                            |
| `CollectionSwitcher` | `collection-switcher.tsx` | The collection dropdown                      |
| `LocaleSwitcher`     | `locale-switcher.tsx`     | The language switcher                        |
| `ThemeToggle`        | `theme-toggle.tsx`        | The light/dark toggle                        |
| `FallbackNotice`     | `fallback-notice.tsx`     | The untranslated-page notice                 |
| `ThemeVariables`     | `theme-variables.tsx`     | The `--makit-color-*` CSS variables          |
| `ThemeScript`        | `theme-script.tsx`        | The pre-hydration color-scheme script        |

`.tsx`, `.jsx`, `.ts`, and `.js` all work. Files in `theme/` whose name is not on this list are ignored, so helper modules can live next to your components:

```text
theme/
├── header.tsx   → the Header component
└── logo.tsx     → just a module header.tsx imports
```

Rename `theme/` with `theme.dir`, or set `theme.dir: false` to turn the convention off.

### Configuring overrides explicitly

`theme.components` does the same thing without relying on file names, and takes priority over `theme/`:

```ts
theme: {
  components: {
    // default export of a file in your project
    Header: "./src/ui/docs-header.tsx",
    // a named export, from a file or a package
    Footer: { from: "@acme/ui", export: "DocsFooter" },
    // remove it entirely
    PrevNextLinks: false,
  },
},
```

Components are referenced by module path, never imported into the config: `makit.config.ts` runs in the Makit CLI, while your components are compiled into the generated site, so the two cannot exchange values.

`false` works for `Footer`, `Sidebar`, `Breadcrumbs`, `PageHeader`, `PrevNextLinks`, `TableOfContents`, `PageActions`, `SearchDialog`, `CollectionSwitcher`, `LocaleSwitcher`, `ThemeToggle`, `FallbackNotice`, and `ThemeScript`. The rest are structural, and disabling one is a build error.

## Reusing the built-in components

Every default component is exported from `@natsuneko-laboratory/makit-runtime`, so an override can wrap one instead of starting over.

Page-level components also receive a `components` prop holding the resolved set, which respects your other overrides. Use it when you replace a page shell but still want the standard parts:

```tsx
// theme/docs-page.tsx
import type { DocsPageProps } from "@natsuneko-laboratory/makit-runtime";

export default async function DocsPage({ page, site, navigation, components }: DocsPageProps) {
  const { Header, Sidebar, PageContent, Footer } = components;

  return (
    <div className="flex min-h-screen flex-col">
      <Header header={site.header} siteTitle={site.title} homeHref={`${site.basePath}/`} />
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <Sidebar navigation={navigation} currentRoute={page.route} components={components} />
        <main className="min-w-0 flex-1 px-8 py-12">
          <h1>{page.title}</h1>
          <PageContent html={page.html} copyButton={site.markdown.code.copyButton} />
        </main>
      </div>
      <Footer footer={site.footer} />
    </div>
  );
}
```

## Server and client components

Components render on the server by default, which is what keeps the output static. Add `"use client"` when you need hooks or event handlers:

```tsx
// theme/theme-toggle.tsx
"use client";

import { useState } from "react";
import type { ThemeToggleProps } from "@natsuneko-laboratory/makit-runtime";

export default function ThemeToggle(_props: ThemeToggleProps) {
  const [theme, setTheme] = useState("light");
  // ...
}
```

Two rules follow from how React Server Components work:

- The five page-level components (`RootLayout`, `DocsPage`, `PortalHomePage`, `RootPage`, `NotFoundPage`) must stay server components, because they receive the `components` set as a prop.
- A client component cannot be `async`. Anything that needs to read generated data has to be a server component.

### Imports inside a client component

`@natsuneko-laboratory/makit-runtime` also exports the data loaders, which read the filesystem. In a `"use client"` module:

- Type-only imports are always fine — they disappear at compile time.
- Importing a default component to wrap it works.
- Import plain values from `@natsuneko-laboratory/makit-runtime/client` instead. That entry point is React-free, so nothing server-only can follow it into the client bundle.

```tsx
"use client";

// The key the built-in pre-hydration script reads, so a custom toggle stays
// consistent with it across reloads.
import { THEME_STORAGE_KEY } from "@natsuneko-laboratory/makit-runtime/client";
import type { ThemeToggleProps } from "@natsuneko-laboratory/makit-runtime";
```

If you get `the chunking context does not support external modules (request: node:fs/promises)`, a client component is importing a value from the main entry point; move that import to `/client`.

## Imports available to a component

Your components live in your project, but they are compiled as part of the generated site, and Makit points these imports at the copies it already uses:

- `react`, `react-dom` (including subpaths such as `react/jsx-runtime`)
- `next` (`next/link`, `next/navigation`, `next/image`, `next/script`, …)
- `lucide-react`
- `@natsuneko-laboratory/makit-runtime`, plus its `/client` entry point

So a component can `import Link from "next/link"` without your project depending on Next.js. Relative imports of your own modules work as usual.

Types are a separate matter: to have your editor resolve `HeaderProps` and friends, add `@natsuneko-laboratory/makit-runtime` and `@types/react` to `devDependencies`. Neither is needed to build.

Server components can also read generated site data through the loaders the runtime exports (`getCollections`, `getGlobalNavigation`, `getSearchIndex`, …).

## Styling

Tailwind classes used in your components are compiled automatically: Makit registers `theme/` and every file named in `theme.components` as Tailwind sources. Helper modules in the same directory are covered too.

CSS you list in `styles` is always loaded last, so it can override anything a theme sets. The `--makit-color-*` and `--makit-radius` variables stay available unless you replace `ThemeVariables` yourself — note that the Markdown body styles depend on them.

Markdown content is handed to components as an HTML string, so there is no per-element component mapping. Style headings, tables, and code blocks through CSS in `styles`.

## Using a theme package

`theme.extends` replaces the built-in theme wholesale, with a package or a directory in your project:

```ts
theme: {
  extends: "@acme/makit-theme-corporate",
  // still overridable per component
  components: {
    Footer: "./theme/footer.tsx",
  },
},
```

A theme does not have to implement every component; anything it leaves out falls back to the built-in one. See the [theme package reference](../04-reference/05-theme-packages.md) to build one.

### Official themes

Four themes are published alongside Makit:

| Package                                       | Looks like                                                                              | Preview site                          |
| --------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------- |
| `@natsuneko-laboratory/makit-theme-terminal`  | Monospace and square-cornered, with a phosphor accent — for CLI and infrastructure docs | https://terminal.makit.natsuneko.com/ |
| `@natsuneko-laboratory/makit-theme-product`   | Soft cards, pill navigation, and a gradient home — for product docs                     | https://product.makit.natsuneko.com/  |
| `@natsuneko-laboratory/makit-theme-editorial` | Serif typography, warm paper tones, and fine rules — for handbooks and long-form guides | `examples/theme-editorial`            |
| `@natsuneko-laboratory/makit-theme-brutalist` | Heavy rules, offset shadows, and signal color — for bold OSS and creative-tool docs     | `examples/theme-brutalist`            |

```bash
pnpm add @natsuneko-laboratory/makit-theme-terminal
```

```ts
theme: {
  extends: "@natsuneko-laboratory/makit-theme-terminal",
},
```

Each ships a manifest, so its accent color and radius apply without being restated — and anything you set in `makit.config.ts` still wins. Working sites are in [`examples/theme-terminal`](https://github.com/mika-f/makit/tree/main/examples/theme-terminal), [`examples/theme-product`](https://github.com/mika-f/makit/tree/main/examples/theme-product), [`examples/theme-editorial`](https://github.com/mika-f/makit/tree/main/examples/theme-editorial), and [`examples/theme-brutalist`](https://github.com/mika-f/makit/tree/main/examples/theme-brutalist).

## Developing

`makit dev` hot-reloads edits to your components like any other source file. Adding, removing, or renaming a file in `theme/` reloads the configuration automatically — no restart needed.

`makit check` verifies that every component reference resolves. Whether a component is a valid React component is reported by your own `tsc` and by the build.

Common errors:

| Code                        | What to fix                                                                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme-module-not-found`    | The path or package in `theme.components` / `theme.extends` does not exist. Paths are relative to the project root and need their extension. |
| `theme-unknown-slot`        | A key in `theme.components` is not a component name; the message suggests the closest one.                                                   |
| `theme-slot-not-optional`   | `false` was used for a structural component.                                                                                                 |
| `theme-ambiguous-slot-file` | Two files in `theme/` map to the same component, such as `header.tsx` and `header.ts`.                                                       |
| `theme-slot-file-ignored`   | A file in `theme/` looks like a misspelled component name, so it is being ignored (warning).                                                 |

## A complete example

[`examples/theme`](https://github.com/mika-f/makit/tree/main/examples/theme) in the repository is a working site that replaces `Header`, `PageHeader`, `ThemeToggle` (a client component), and `Footer`, disables `PrevNextLinks`, and keeps everything else built in.
