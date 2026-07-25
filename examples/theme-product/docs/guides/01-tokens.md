# Tokens

The accent drives the logo mark, the active navigation pill, the table of
contents highlight, and the home page's gradient, so changing it changes the
whole site's character.

## Accents

`theme.accentColor` accepts these names, or any CSS color.

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

Each name carries a pair rather than one hue, because the theme's two
backgrounds — white and a deep navy — need different weights to stay legible.

## Radius

Unlike the terminal theme, this one honors `theme.radius` throughout.

| Value    | Applied                           |
| -------- | --------------------------------- |
| `none`   | `0`                               |
| `small`  | `0.375rem`                        |
| `medium` | `0.625rem`                        |
| `large`  | `0.875rem` (the manifest default) |

## Color scheme

```ts title="makit.config.ts"
theme: {
  extends: "@natsuneko-laboratory/makit-theme-product",
  colorScheme: "system",
}
```

With `"system"`, the header renders Makit's theme toggle and a pre-hydration
script applies the stored choice before first paint — no flash.

> [!NOTE]
> The theme redefines every `--makit-color-*` variable rather than adding its
> own, so Makit's Markdown styles, code blocks, and copy buttons follow the
> palette automatically.
