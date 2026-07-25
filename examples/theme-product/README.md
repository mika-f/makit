# Product theme example

A Makit site using the official product theme, and documenting it.

```bash
pnpm install
pnpm --filter makit-example-theme-product dev
```

The whole page shell comes from `theme.extends` — this project contains no
components of its own, only Markdown:

```ts
// makit.config.ts
theme: {
  extends: "@natsuneko-laboratory/makit-theme-product",
  accentColor: "violet",
},
```

Contrast this with [`examples/theme`](../theme), which replaces individual
components without a theme package.

## What to look at

| Where               | What it shows                                               |
| ------------------- | ----------------------------------------------------------- |
| Sidebar             | Accent-tinted active pill                                   |
| Page title          | The eyebrow, read from the page's navigation hierarchy      |
| Table of contents   | A floating card rather than a bare list                     |
| Any `h2`            | The ruled section break, from the theme's stylesheet        |
| `theme.accentColor` | Set to `violet`, overriding the manifest's `indigo` default |
