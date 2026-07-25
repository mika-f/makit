# @natsuneko-laboratory/makit-theme-product

A Makit theme for product documentation — the kind that sits one click from a
marketing site. Soft cards, pill navigation, a gradient home page, and a
reading column with room to breathe.

## Install

```bash
pnpm add @natsuneko-laboratory/makit-theme-product
```

```ts
// makit.config.ts
import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  theme: {
    extends: "@natsuneko-laboratory/makit-theme-product",
  },
});
```

The theme's manifest supplies `radius: "large"` and `accentColor: "indigo"`.
Anything set in `makit.config.ts` takes priority over those defaults.

## Accents

`theme.accentColor` accepts the names below, or any CSS color (used as-is for
both schemes). Each name carries a light/dark pair, because the theme's two
backgrounds — white and a deep navy — need different weights to stay legible.

| Name      | Light     | Dark      |
| --------- | --------- | --------- |
| `indigo`  | `#4f46e5` | `#818cf8` |
| `violet`  | `#7c3aed` | `#a78bfa` |
| `blue`    | `#2563eb` | `#60a5fa` |
| `sky`     | `#0284c7` | `#38bdf8` |
| `teal`    | `#0d9488` | `#2dd4bf` |
| `emerald` | `#059669` | `#34d399` |
| `rose`    | `#e11d48` | `#fb7185` |
| `amber`   | `#d97706` | `#fbbf24` |

Both palettes meet WCAG AA against their background for body, subtle, and
accent text.

Unlike the terminal theme, this one honors `theme.radius` throughout.

## Slots

The theme implements thirteen slots:

`RootLayout`, `DocsPage`, `PortalHomePage`, `NotFoundPage`, `Header`,
`Sidebar`, `NavigationItems`, `Breadcrumbs`, `PageHeader`, `PrevNextLinks`,
`TableOfContents`, `Footer`, `ThemeVariables`.

Everything else falls back to Makit's standard theme — its rounded,
variable-driven styling already matches, so rewriting it would only add
surface area.

## Notes

`PageHeader` renders an eyebrow above the title, taken from the page's nearest
ancestor in the canonical navigation hierarchy. No configuration is involved:
a page under `guides/` gets "Guides".

## License

MIT
