# Terminal theme example

A Makit site using the official terminal theme, and documenting it.

```bash
pnpm install
pnpm --filter makit-example-theme-terminal dev
```

The whole page shell comes from `theme.extends` — this project contains no
components of its own, only Markdown:

```ts
// makit.config.ts
theme: {
  extends: "@natsuneko-laboratory/makit-theme-terminal",
},
```

Contrast this with [`examples/theme`](../theme), which replaces individual
components without a theme package.

## What to look at

| Where               | What it shows                                        |
| ------------------- | ---------------------------------------------------- |
| Sidebar             | The `·`/`>` item markers and the `▸`/`▾` disclosure  |
| Table of contents   | `#`/`##` depth markers, matching the source Markdown |
| Any heading         | The `##` prefix, from the theme's stylesheet         |
| Search dialog       | Makit's own component, re-skinned by variables alone |
| `theme.accentColor` | Unset here, so the manifest's `green` applies        |
