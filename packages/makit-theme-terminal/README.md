# @natsuneko-laboratory/makit-theme-terminal

A Makit theme for documentation that lives next to a shell: CLIs, daemons,
build tools, infrastructure. Monospace throughout, square corners, and a
phosphor accent.

## Install

```bash
pnpm add @natsuneko-laboratory/makit-theme-terminal
```

```ts
// makit.config.ts
import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  theme: {
    extends: "@natsuneko-laboratory/makit-theme-terminal",
  },
});
```

The theme's manifest supplies `radius: "none"`, `accentColor: "green"`, and a
GitHub code theme, so nothing else is required. Anything set in
`makit.config.ts` takes priority over those defaults.

## Accents

`theme.accentColor` accepts the names below, or any CSS color (used as-is for
both schemes).

| Name      | Light     | Dark      |
| --------- | --------- | --------- |
| `green`   | `#15803d` | `#4ade80` |
| `amber`   | `#b45309` | `#fbbf24` |
| `cyan`    | `#0e7490` | `#22d3ee` |
| `magenta` | `#a21caf` | `#e879f9` |
| `blue`    | `#1d4ed8` | `#60a5fa` |
| `red`     | `#b91c1c` | `#f87171` |
| `white`   | `#27272a` | `#e4e4e7` |

Both palettes meet WCAG AA against their background for body, subtle, and
accent text.

## Slots

The theme implements fourteen slots:

`RootLayout`, `DocsPage`, `PortalHomePage`, `NotFoundPage`, `Header`,
`Sidebar`, `NavigationItems`, `Breadcrumbs`, `PageHeader`, `PrevNextLinks`,
`TableOfContents`, `Footer`, `ThemeToggle`, `ThemeVariables`.

Everything else falls back to Makit's standard theme. Those components read
the same `--makit-color-*` variables this theme redefines, and the bundled
stylesheet squares off their corners, so they match without being rewritten.

## Known limitations

`theme.radius` has no effect — square corners are the point of the theme, and
the stylesheet enforces them on the components it does not own. Rendered
Markdown is excluded from that rule, so authored content keeps whatever shape
it asks for.

## License

MIT
