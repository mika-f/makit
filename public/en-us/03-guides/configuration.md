# Configuration

Put site-wide settings in `makit.config.ts` at the project root.

## Start with the minimum

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  title: "My Documentation",
});
```

## Common settings

```ts
export default defineConfig({
  title: "My Documentation",
  description: "Documentation for my project",
  lang: "en-US",
  siteUrl: "https://docs.example.com",
  sourceDir: "docs",
  publicDir: "public",
  outDir: "dist",
  theme: {
    colorScheme: "system",
    accentColor: "violet",
  },
});
```

- `sourceDir`: directory containing Markdown content
- `publicDir`: directory for static assets such as images and favicons
- `outDir`: output directory for the generated site
- `siteUrl`: site URL for canonical links and sitemaps
- `theme`: color-scheme and accent-color settings

## Markdown output for LLMs

Enable Markdown endpoints together with `llms.txt` and `llms-full.txt` when you want a site to be easy for LLMs and agents to consume. It is disabled by default.

```ts
export default defineConfig({
  title: "My Documentation",
  llms: {
    enabled: true,
  },
});
```

When enabled, the build output includes a `*.md` file for each page URL (for example, `/guides/setup.md`) and site guide files. The home-page Markdown is available at `/index.md`.

## Header and footer

```ts
export default defineConfig({
  title: "My Documentation",
  header: {
    title: "My Docs",
    links: [{ label: "GitHub", href: "https://github.com/example/docs", external: true }],
  },
  footer: {
    copyright: "© 2026 Example",
  },
});
```

## After changing configuration

`makit dev` detects configuration-file changes during development. Before publishing, run `makit check` followed by `makit build`.
