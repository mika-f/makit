# `@natsuneko-laboratory/makit-adapter-cloudflare-pages`

An official [Makit](https://github.com/mika-f/makit) deployment adapter for Cloudflare Pages. It generates a `_redirects` file, a `_headers` file, and optionally a `wrangler.jsonc`, from your Makit config's redirects and header rules.

```bash
pnpm add -D @natsuneko-laboratory/makit-adapter-cloudflare-pages
```

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";
import cloudflarePages from "@natsuneko-laboratory/makit-adapter-cloudflare-pages";

export default defineConfig({
  deployment: {
    adapter: cloudflarePages({
      projectName: "my-docs",
      generateWranglerConfig: true,
    }),
  },
});
```

Run `makit adapter generate` to write the adapter's files, or `makit build`, which generates them as part of the build.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `projectName` | — | Project name written into the generated `wrangler.jsonc` |
| `generateWranglerConfig` | `false` | Generate a `wrangler.jsonc` in the project root |
| `redirects.mode` | `"native"` | `"native"` writes a `_redirects` file; `"html"` writes a redirect HTML page per redirect instead |
| `headers.enabled` | `true` | Write a `_headers` file from configured header rules |

## Capabilities

Native redirects, conditional redirects, and custom headers are supported.
Country-conditioned redirects are not representable in a Pages `_redirects`
file and are reported as a warning during `makit check`.
