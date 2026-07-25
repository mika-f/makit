# Terminal theme

A Makit theme for documentation that lives next to a shell: CLIs, daemons,
build tools, infrastructure. Monospace throughout, square corners, and a
phosphor accent.

## What it changes

The theme replaces fourteen of Makit's slots and leaves the rest alone. The
search dialog, collection switcher, and locale switcher are Makit's own
components — they read the same `--makit-color-*` variables this theme
redefines, so they pick up the palette without being rewritten.

| Area       | Treatment                                        |
| ---------- | ------------------------------------------------ |
| Typography | Monospace everywhere, including body copy        |
| Corners    | Square, including the components left to Makit   |
| Navigation | A `▸`/`▾` tree with `·` and `>` item markers     |
| Headings   | `#`, `##`, `###` prefixes matching the source    |
| Palette    | Near-black in dark mode, warm off-white in light |

## Install

```bash
pnpm add @natsuneko-laboratory/makit-theme-terminal
```

Then point `theme.extends` at it:

```ts title="makit.config.ts"
export default defineConfig({
  theme: {
    extends: "@natsuneko-laboratory/makit-theme-terminal",
  },
});
```

> [!NOTE]
> The theme draws its own square corners, so `theme.radius` has no effect.
> Every other token — `accentColor`, `colorScheme`, `codeTheme` — works as
> usual.
