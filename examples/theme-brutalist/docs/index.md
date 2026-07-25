# Brutalist theme

A Makit theme that makes the interface structure visible. Heavy rules, square
geometry, offset shadows, and high-energy highlights give documentation the
character of a printed poster or a tool manual.

## What it changes

Ten Makit slots define the shell. Standard search, switchers, breadcrumbs, and
page actions remain fully functional and inherit the square geometry.

| Area       | Treatment                                     |
| ---------- | --------------------------------------------- |
| Typography | Heavy sans-serif, uppercase display hierarchy |
| Navigation | Boxed states with offset highlight shadows    |
| Layout     | Exposed column rules and construction grid    |
| Palette    | Near-black ink with signal yellow             |
| Content    | Ruled headings and poster-like callouts       |

## Install

```bash
pnpm add @natsuneko-laboratory/makit-theme-brutalist
```

```ts title="makit.config.ts"
export default defineConfig({
  theme: {
    extends: "@natsuneko-laboratory/makit-theme-brutalist",
  },
});
```

> [!IMPORTANT]
> This theme is intentionally opinionated. It always uses square interface
> controls, even if the project sets another `theme.radius`.
