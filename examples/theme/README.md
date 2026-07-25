# Theme example

A Makit site with several of its components replaced. Run it with:

```bash
pnpm install
pnpm --filter makit-example-theme dev
```

## What this example shows

| File                     | Component       | Point it makes                                                                   |
| ------------------------ | --------------- | -------------------------------------------------------------------------------- |
| `theme/header.tsx`       | `Header`        | The `theme/` directory is scanned automatically; wrapping the built-in component |
| `theme/page-header.tsx`  | `PageHeader`    | Replacing a component outright, reading `page.taxonomy`                          |
| `theme/theme-toggle.tsx` | `ThemeToggle`   | A client component (`"use client"` + hooks)                                      |
| `theme/banner.tsx`       | —               | Not a component name, so it is ignored: helper modules are fine here             |
| `src/site-footer.tsx`    | `Footer`        | A named export referenced explicitly from `makit.config.ts`                      |
| `makit.config.ts`        | `PrevNextLinks` | Removing a component with `false`                                                |

The sidebar, breadcrumbs, search, and table of contents are untouched, so the
example also shows custom and built-in components composing in one page.

`package.json` depends on `@natsuneko-laboratory/makit` only — `react` and
`next` are resolved by Makit. The `devDependencies` are there so an editor can
resolve the props types.

## Replacing the whole theme instead

For a complete theme, point `theme.extends` at a package or a directory:

```ts
theme: {
  extends: "./my-theme",
  // still overridable per component
  components: {
    Footer: "./src/site-footer.tsx",
  },
},
```

A directory theme needs an entry file that exports the components it
implements, and may add a manifest for its CSS and token defaults:

```text
my-theme/
├── index.tsx        // export function Header(...) { ... }
└── makit-theme.ts   // export default defineTheme({ name, styles, defaults })
```

Anything the theme does not implement falls back to Makit's own component.

## Learn more

- [Theming guide](https://makit.natsuneko.com/en-us/guides/theming/)
- [Theme package reference](https://makit.natsuneko.com/en-us/reference/theme-packages/)
