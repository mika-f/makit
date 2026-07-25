# Editorial theme

A Makit theme for material meant to be read, not merely scanned. It borrows
from books, journals, and technical handbooks: a warm paper palette, serif
display typography, fine rules, and a deliberately quiet interface.

## What it changes

The theme replaces ten Makit slots. Standard search, switchers, breadcrumbs,
and page actions remain in place, but inherit the editorial palette.

| Area       | Treatment                                     |
| ---------- | --------------------------------------------- |
| Typography | Serif display and reading faces               |
| Navigation | Fine rules, compact labels, no card chrome    |
| Layout     | A narrow article column with generous margins |
| Palette    | Warm paper neutrals with an oxblood accent    |
| Contents   | Marginalia-style links beside the article     |

## Install

```bash
pnpm add @natsuneko-laboratory/makit-theme-editorial
```

```ts title="makit.config.ts"
export default defineConfig({
  theme: {
    extends: "@natsuneko-laboratory/makit-theme-editorial",
  },
});
```

> [!NOTE]
> The font stacks use widely available local serif faces. Projects can load a
> preferred publication face in their own stylesheet and override the stacks.
