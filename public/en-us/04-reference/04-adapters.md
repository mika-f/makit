# Adapter reference

An Adapter turns Makit configuration into files for a hosting provider. It is optional: without one, deploy `dist/` as a static site. Install only the provider package you use and pass its factory result to `deployment.adapter`.

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";
import githubPages from "@natsuneko-laboratory/makit-adapter-github-pages";

export default defineConfig({
  title: "My Documentation",
  deployment: { adapter: githubPages({ repository: "owner/docs" }) },
});
```

Run `makit check` to inspect generated files, or `makit adapter generate` to write them. Keep credentials outside of `makit.config.ts`.

## Shared deployment settings

`configFile.mode` is `generated` (default), `merge`, or `manual`. `redirects` defaults to `true`; `headers` defaults to `false`. `cleanUrls`, `customDomain`, `generateCi`, and `preview.enabled` opt into the related provider integration. Site rules live in top-level `redirects` and `headers`.

## Cloudflare Pages

```ts
cloudflarePages({
  projectName: "my-docs",
  generateWranglerConfig: true,
  redirects: { mode: "native" },
  headers: { enabled: true },
});
```

`projectName` is written to generated `wrangler.jsonc`; `generateWranglerConfig` defaults to `false`. Redirect mode is `native` (default, output `_redirects`) or `html`. `headers.enabled` defaults to `true` and generates `_headers`. Cloudflare Pages supports native redirects and custom headers.

## GitHub Pages

```ts
githubPages({
  repository: "owner/docs",
  siteType: "project",
  basePath: "auto",
  generateWorkflow: true,
  branch: "main",
});
```

`repository` accepts `owner/repository` or `auto` (environment or Git origin). `siteType` is `project` (default), `user`, or `organization`; `basePath: "auto"` uses the repository name for a project site. `customDomain` generates `CNAME` and requires an empty base path. `generateWorkflow` defaults to `deployment.generateCi`; `workflowPath` defaults to `.github/workflows/deploy-makit.yml`; `branch` defaults to `main`.

The Adapter emits `.nojekyll` and HTML redirects. GitHub Pages does not support custom response headers, so headers and conditional redirects generate warnings.

## Netlify

```ts
netlify({
  generateConfig: true,
  configPath: "netlify.toml",
  redirects: { format: "toml" },
  headers: { format: "toml" },
  i18nRouting: "native",
});
```

`generateConfig` defaults to `true`; `configPath` defaults to `netlify.toml`. Redirect and header formats are `toml` (default) or `file` (`_redirects` / `_headers`). `i18nRouting` is `client` by default, which omits language conditions; use `native` for Netlify language conditions. In merge mode, Makit owns only the block between `# makit:start` and `# makit:end`.

## Vercel

```ts
vercel({ generateConfig: true, configPath: "vercel.json", cleanUrls: true, trailingSlash: true });
```

`generateConfig` defaults to `true`; `configPath` defaults to `vercel.json`. `cleanUrls` falls back to `deployment.cleanUrls`, and `trailingSlash` to `build.trailingSlash`. Redirects and headers become `vercel.json` rules. A 301 has Vercel 308 semantics and a 302 has 307 semantics; country conditions cannot be represented and generate a warning.

| Host             | Redirects           | Headers | CI generation |
| ---------------- | ------------------- | ------- | ------------- |
| Cloudflare Pages | Native or HTML      | Yes     | No            |
| GitHub Pages     | HTML                | No      | Yes           |
| Netlify          | Native, conditional | Yes     | No            |
| Vercel           | Native              | Yes     | No            |
