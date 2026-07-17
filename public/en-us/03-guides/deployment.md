# Deployment

`makit build` produces static files that do not need a server. Deploy the output in `dist/` to your chosen hosting service.

## Without an adapter

An adapter is not required for simple static hosting.

```bash
pnpm exec makit build
```

## With an adapter

Adapters generate hosting-specific configuration files and CI workflows. Configure one by explicitly calling its factory function rather than setting a string.

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

The official adapters currently target Cloudflare Pages, GitHub Pages, Netlify, and Vercel.

## Credentials

Do not put API tokens or private keys in `makit.config.ts`. Use deployment environment variables or each service's CLI authentication instead.

## Check before publishing

```bash
pnpm exec makit check
pnpm exec makit build
pnpm exec makit preview
```

Use `preview` to confirm that the generated static files render as expected before deployment.
