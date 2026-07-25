# Welcome to Makit

Makit is a Node.js CLI for creating static documentation sites from Markdown. Write content in Markdown and use TypeScript for site structure and detailed configuration.

Whether you are turning a small project README into a site or building a large portal for several products, you can start with the same approach.

## What you can do

- Convert Markdown into an HTML documentation site
- Generate a sidebar automatically from filename ordering
- Configure page titles and navigation with type-safe TypeScript
- Organize large sites with collections, sections, and groups
- Handle localized pages and fallbacks for missing translations
- Replace any built-in component — or the whole theme — with your own React components
- Deploy static files to GitHub Pages, Cloudflare Pages, Netlify, Vercel, and more

## Try it quickly

```bash
pnpm add -D @natsuneko-laboratory/makit
pnpm exec makit init
pnpm exec makit dev
```

Edit the generated `docs/index.md` to update the page in the development server. For a fuller walkthrough, read [Getting started](./01-getting-started.md).

## Where to go next

1. [Getting started](./01-getting-started.md) — install Makit and build your first site
2. [Core concepts](./02-concepts.md) — understand the file layout and model
3. [Configuration](./03-guides/03-configuration.md) — configure `makit.config.ts`
4. [Content structure](./03-guides/02-content-structure.md) — organize a growing site
5. [Theming](./03-guides/06-theming.md) — replace components with your own
6. [Deployment](./03-guides/04-deployment.md) — publish a static site
7. [CLI reference](./04-reference/01-cli.md) — see all available commands

## Learn more about the design

This site presents the repository's [specification](https://github.com/mika-f/makit/tree/main/docs) for users. Refer to it for implementation details and API design background.
