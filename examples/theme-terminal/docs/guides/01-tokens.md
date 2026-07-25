# Tokens

The theme ships a manifest, so it can recommend token values without the
project restating them.

## Defaults from the manifest

```ts title="src/manifest.ts"
export default defineTheme({
  name: "@natsuneko-laboratory/makit-theme-terminal",
  styles: ["./styles/theme.css"],
  tailwindSources: ["./dist/**/*.mjs"],
  defaults: {
    radius: "none",
    accentColor: "green",
    codeTheme: { light: "github-light", dark: "github-dark" },
  },
});
```

Manifest defaults sit between Makit's own defaults and the project's
`makit.config.ts`, so anything set in the config still wins.

## Accents

`theme.accentColor` accepts the terminal color names below, or any CSS color.

| Name      | Light     | Dark      |
| --------- | --------- | --------- |
| `green`   | `#15803d` | `#4ade80` |
| `amber`   | `#b45309` | `#fbbf24` |
| `cyan`    | `#0e7490` | `#22d3ee` |
| `magenta` | `#a21caf` | `#e879f9` |
| `blue`    | `#1d4ed8` | `#60a5fa` |
| `red`     | `#b91c1c` | `#f87171` |
| `white`   | `#27272a` | `#e4e4e7` |

```ts title="makit.config.ts"
theme: {
  extends: "@natsuneko-laboratory/makit-theme-terminal",
  accentColor: "amber",
}
```

An unrecognized value is passed through to CSS unchanged and used for both
color schemes.

## Overriding the CSS

The theme's stylesheet is imported before the project's own, so
`config.styles` can still override any of it.

```ts title="makit.config.ts"
styles: ["./styles/overrides.css"],
```
