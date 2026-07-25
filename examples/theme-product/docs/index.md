# Product theme

A Makit theme for product documentation — the kind that sits one click from a
marketing site. Soft cards, pill navigation, a gradient home page, and a
reading column with room to breathe.

## What it changes

The theme replaces thirteen of Makit's slots. The search dialog, switchers,
and theme toggle are Makit's own components: their rounded, variable-driven
styling already matches, so rewriting them would only add surface area.

| Area       | Treatment                                          |
| ---------- | -------------------------------------------------- |
| Typography | Inter, larger body copy, ruled `h2` section breaks |
| Navigation | Rounded pills, accent-tinted active state          |
| Contents   | A floating card rather than a bare list            |
| Home       | A gradient hero above lettered collection cards    |
| Palette    | Slate-tinted grays under a saturated accent        |

## Install

```bash
pnpm add @natsuneko-laboratory/makit-theme-product
```

```ts title="makit.config.ts"
export default defineConfig({
  theme: {
    extends: "@natsuneko-laboratory/makit-theme-product",
  },
});
```

> [!TIP]
> This example site sets `accentColor: "violet"`, overriding the theme's own
> `indigo` default — manifest defaults always sit below the project's config.
