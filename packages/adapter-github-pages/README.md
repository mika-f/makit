# `@natsuneko-laboratory/makit-adapter-github-pages`

An official [Makit](https://github.com/mika-f/makit) deployment adapter for GitHub Pages. It resolves `basePath` and `siteUrl` from the target repository, writes HTML redirect pages, an optional `CNAME` for a custom domain, and an optional GitHub Actions workflow that builds and deploys the site.

```bash
pnpm add -D @natsuneko-laboratory/makit-adapter-github-pages
```

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";
import githubPages from "@natsuneko-laboratory/makit-adapter-github-pages";

export default defineConfig({
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

Run `makit adapter generate` to write the adapter's files, or `makit build`, which generates them as part of the build.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `repository` | — | `owner/name`, or `"auto"` to resolve it from `GITHUB_REPOSITORY` or the project's git remote |
| `siteType` | `"project"` | `"project"`, `"user"`, or `"organization"` — affects the resolved `basePath` |
| `basePath` | — | An explicit base path, or `"auto"` to derive it from the resolved repository name |
| `customDomain` | — | Domain written to a generated `CNAME` file; requires an empty `basePath` |
| `generateWorkflow` | `config.deployment.generateCi` | Generate a GitHub Actions workflow that builds and deploys the site |
| `workflowPath` | `.github/workflows/deploy-makit.yml` | Path for the generated workflow file |
| `branch` | `"main"` | Branch that triggers the generated workflow |

## Capabilities

Custom 404 pages, a base path, a custom domain file, and a generated CI
workflow are supported. GitHub Pages has no native redirect or custom-header
mechanism, so redirects are emitted as static HTML pages and custom header
rules are reported as a warning during `makit check`.
