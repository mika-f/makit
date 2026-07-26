# `@natsuneko-laboratory/makit`

A Node.js CLI for building searchable, multilingual static documentation sites
from Markdown and TypeScript. It scales from a small project README to a
portal for multiple products.

## Features

- Generate static HTML documentation sites from Markdown
- Keep stable URLs while ordering pages with filename prefixes
- Define site and page metadata with type-safe TypeScript
- Organize large sites with collections, sections, and groups
- Support localized content and fallbacks for missing translations
- Add full-text search with Pagefind
- Build changelog pages from a GitHub repository's releases at build time
- Optionally generate `llms.txt`, `llms-full.txt`, and Markdown endpoints for every page
- Use official adapters for GitHub Pages, Cloudflare Pages, Netlify, and Vercel

## Requirements

- Node.js 20 or later
- pnpm, npm, or Yarn

## Quick start

```bash
pnpm add -D @natsuneko-laboratory/makit
pnpm exec makit init
pnpm exec makit dev
```

Edit `docs/index.md` and preview the changes in the development server. To
validate, build, and preview the production site:

```bash
pnpm exec makit check
pnpm exec makit build
pnpm exec makit preview
```

The generated site is written to `dist/` by default.

## Minimal project

```text
my-docs/
├── docs/
│   └── index.md
├── public/
├── makit.config.ts
└── package.json
```

Configure the site in `makit.config.ts`.

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  title: "My Documentation",
  description: "Documentation for my project.",
  lang: "en-US",
  siteUrl: "https://docs.example.com",
});
```

Write page content in Markdown. To provide an explicit title or stable page
ID, add a matching `.meta.ts` file alongside the page.

```ts
import { definePageMetadata } from "@natsuneko-laboratory/makit/metadata";

export default definePageMetadata({
  id: "configuration",
  title: "Configuration",
});
```

Numeric filename prefixes control display order only; they are not included
in URLs. For example, `docs/02-guides/01-installation.md` becomes
`/guides/installation/`.

## CLI

| Command | Description |
| --- | --- |
| `makit init [dir]` | Scaffold a new Makit project |
| `makit dev` | Start the development server |
| `makit check` | Validate configuration and documentation without building |
| `makit build` | Build the static site for production |
| `makit preview` | Serve the built static site locally |
| `makit clean` | Remove generated output (`.makit/` and `outDir`) |
| `makit adapter generate` | Generate deployment adapter files |

Run `makit <command> --help` for the full list of flags.

## Deployment

Without an adapter, deploy the contents of `dist/` to any static hosting
provider. To generate provider-specific configuration or CI workflows,
install the relevant adapter.

```bash
pnpm add -D @natsuneko-laboratory/makit-adapter-github-pages
```

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";
import githubPages from "@natsuneko-laboratory/makit-adapter-github-pages";

export default defineConfig({
  title: "My Documentation",
  deployment: {
    adapter: githubPages({
      repository: "owner/docs",
      siteType: "project",
      basePath: "auto",
      generateWorkflow: true,
    }),
  },
});
```

Official adapters:

- `@natsuneko-laboratory/makit-adapter-cloudflare-pages`
- `@natsuneko-laboratory/makit-adapter-github-pages`
- `@natsuneko-laboratory/makit-adapter-netlify`
- `@natsuneko-laboratory/makit-adapter-vercel`

## Themes

The built-in theme needs no configuration. To replace the whole page shell,
install a theme package and point `theme.extends` at it:

```bash
pnpm add @natsuneko-laboratory/makit-theme-terminal
```

```ts
export default defineConfig({
  theme: {
    extends: "@natsuneko-laboratory/makit-theme-terminal",
    // Individual components can still be replaced on top of the theme.
    components: {
      Footer: "./theme/footer.tsx",
    },
  },
});
```

Official themes:

- `@natsuneko-laboratory/makit-theme-terminal` — monospace and square-cornered, for CLI and infrastructure documentation
- `@natsuneko-laboratory/makit-theme-product` — soft cards and pill navigation, for product documentation
- `@natsuneko-laboratory/makit-theme-editorial` — serif typography and warm paper tones, for handbooks and long-form guides
- `@natsuneko-laboratory/makit-theme-brutalist` — heavy rules and high-contrast signal color, for bold OSS and creative-tool documentation

## Documentation

See the [Makit repository](https://github.com/mika-f/makit) for the full
specification, theme authoring guide, and example projects.

## License

[MIT](https://github.com/mika-f/makit/blob/main/LICENSE)
