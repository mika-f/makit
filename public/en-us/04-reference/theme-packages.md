# Theme package reference

A theme package supplies the components Makit renders pages with. Point `theme.extends` at it, and anything it does not implement falls back to the built-in theme.

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  title: "My Documentation",
  theme: { extends: "@acme/makit-theme-corporate" },
});
```

For overriding a component or two, see the [theming guide](../03-guides/theming.md) — you do not need a package for that.

## Package layout

A theme exposes two entry points: the components, and an optional manifest the Makit CLI reads in plain Node.

```json
{
  "name": "@acme/makit-theme-corporate",
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.mts", "import": "./dist/index.mjs" },
    "./makit-theme": { "types": "./dist/manifest.d.mts", "import": "./dist/manifest.mjs" }
  }
}
```

- `.` exports one component per slot it implements, each a named export matching the component name (`Header`, `DocsPage`, …). Makit imports this from the generated site, so it may contain server and client components.
- `./makit-theme` default-exports the manifest. Makit loads this in Node, so it must not import React.

Naming the package `makit-theme-*` is recommended but not required.

When bundling, keep `"use client"` directives at the top of each module that needs them — a single-file bundle loses them. `tsdown`'s `unbundle: true` and equivalent options preserve them.

## A theme in your project

`theme.extends` also accepts a directory, which is resolved by file name instead of an `exports` map:

```text
my-theme/
├── index.tsx          → the components
├── makit-theme.ts     → the manifest (optional)
└── theme.css
```

```ts
theme: { extends: "./my-theme" }
```

The entry may be `index.tsx`, `index.jsx`, `index.ts`, `index.js`, or `index.mjs`; the manifest may be `makit-theme.ts`, `.mts`, `.js`, or `.mjs`. A directory with no entry file is a build error.

## Components

```tsx
// src/index.tsx
import type { FooterProps, HeaderProps } from "@natsuneko-laboratory/makit-runtime";

export function Header({ header, siteTitle, homeHref, actions }: HeaderProps) {
  // ...
}

export function Footer({ footer }: FooterProps) {
  // ...
}
```

The component names, their props types, and the server/client rules are the same as for per-component overrides; the [theming guide](../03-guides/theming.md) lists all of them. Props types are public API and follow semantic versioning.

`@natsuneko-laboratory/makit-runtime` belongs in `peerDependencies` alongside `react` and `next`, the way the built-in theme declares them.

## Manifest

```ts
// src/manifest.ts
import { defineTheme } from "@natsuneko-laboratory/makit/theme";

export default defineTheme({
  name: "@acme/makit-theme-corporate",
  styles: ["./dist/theme.css"],
  tailwindSources: ["./dist/**/*.mjs"],
  defaults: {
    accentColor: "#0b5cd5",
    radius: "none",
  },
});
```

| Field             | Description                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`            | Display name used in diagnostics. Required.                                                                                                                                                       |
| `styles`          | CSS the theme ships, relative to the theme root. Loaded before the user's `styles`, so a project can always override it.                                                                          |
| `tailwindSources` | Globs, relative to the theme root, that Tailwind scans for class names. Defaults to `**/*.{js,mjs,jsx}` for a package, and `**/*.{ts,tsx,js,jsx,mjs}` for a directory theme.                      |
| `defaults`        | Recommended values for `colorScheme`, `accentColor`, `radius`, and `codeTheme`. They sit between Makit's defaults and the project's own configuration, so anything set in `makit.config.ts` wins. |

The manifest must be synchronous and hold serializable values only. The default export has to come from `defineTheme()`; a plain object is rejected with `theme-manifest-invalid`.

Omitting the manifest is fine — the theme then ships no CSS, uses the default Tailwind globs, and recommends no tokens.

## Combining with per-component overrides

`theme.components` is applied on top of `theme.extends`, so a project can adopt a theme and still replace parts of it:

```ts
theme: {
  extends: "@acme/makit-theme-corporate",
  components: {
    Footer: "./theme/footer.tsx",
    PrevNextLinks: false,
  },
},
```

Resolution order for each component is: `theme.components`, then the `theme/` directory, then `theme.extends`, then the built-in theme.

## Diagnostics

| Code                        | Meaning                                                                 |
| --------------------------- | ----------------------------------------------------------------------- |
| `theme-module-not-found`    | `theme.extends` or a component reference could not be resolved          |
| `theme-unknown-slot`        | `theme.components` names something that is not a component              |
| `theme-slot-not-optional`   | `false` was given for a structural component                            |
| `theme-ambiguous-slot-file` | The same component matches two files in `theme/`                        |
| `theme-manifest-invalid`    | The manifest is malformed, or declares a stylesheet that does not exist |
| `theme-slot-file-ignored`   | A file in `theme/` looks like a misspelled component name (warning)     |
| `theme-outside-project`     | A component reference resolves outside the project root (warning)       |

A missing named export is reported by the site build rather than by `makit check`.

## Example

[`examples/theme`](https://github.com/mika-f/makit/tree/main/examples/theme) in the repository replaces several components and shows, in its README, how to move the same code into a `theme.extends` theme.
