# Makit

Makit is a Node.js CLI for building searchable, multilingual static documentation sites from Markdown and TypeScript. It scales from a small project README to a portal for multiple products.

## Features

- Generate static HTML documentation sites from Markdown
- Keep stable URLs while ordering pages with filename prefixes
- Define site and page metadata with type-safe TypeScript
- Organize large sites with collections, sections, and groups
- Support localized content and fallbacks for missing translations
- Add full-text search with Pagefind
- Optionally generate `llms.txt`, `llms-full.txt`, and Markdown endpoints for every page
- Use official adapters for GitHub Pages, Cloudflare Pages, Netlify, and Vercel

## Requirements

- Node.js 20 or later
- pnpm, npm, or Yarn

## Quick start

Add Makit as a development dependency, then scaffold a documentation site.

```bash
pnpm add -D @natsuneko-laboratory/makit
pnpm exec makit init
pnpm exec makit dev
```

Edit `docs/index.md` and preview the changes in the development server. To validate, build, and preview the production site:

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

Write page content in Markdown. To provide an explicit title or stable page ID, add a matching `.meta.ts` file alongside the page.

```ts
import { definePageMetadata } from "@natsuneko-laboratory/makit/metadata";

export default definePageMetadata({
  id: "configuration",
  title: "Configuration",
});
```

Numeric filename prefixes control display order only; they are not included in URLs. For example, `docs/02-guides/01-installation.md` becomes `/guides/installation/`.

## Deployment

Without an adapter, deploy the contents of `dist/` to any static hosting provider. To generate provider-specific configuration or CI workflows, install the relevant adapter.

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

## Documentation

The documentation site is available in [English](public/en-us/index.md) and [Japanese](public/ja-jp/index.md). See also the [specification](docs/01-SPECIFICATION.md) for the full design and API details.

## Development

This repository is a pnpm workspace managed with Turborepo.

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

Issues, feature requests, and pull requests are welcome. For substantial changes, please start a discussion in [Issues](https://github.com/mika-f/makit/issues).

## License

[MIT](LICENSE)
