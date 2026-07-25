# `@natsuneko-laboratory/makit-theme-editorial`

An official Makit theme for long-form guides, handbooks, and knowledge bases.
It pairs serif reading type with warm paper tones, fine rules, and restrained
navigation.

```bash
pnpm add @natsuneko-laboratory/makit-theme-editorial
```

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  theme: {
    extends: "@natsuneko-laboratory/makit-theme-editorial",
  },
});
```

## Defaults

- Accent: `oxblood`
- Radius: `small`
- Code theme: `github-light` / `github-dark`

Named accents are `oxblood`, `rust`, `forest`, `navy`, `plum`, and `gold`.
Any CSS color is also accepted.

The theme implements ten slots. Search, switchers, page actions, breadcrumbs,
and other omitted slots use Makit's standard components, recolored by the
theme's complete `--makit-color-*` palette.
