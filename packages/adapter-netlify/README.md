# `@natsuneko-laboratory/makit-adapter-netlify`

An official [Makit](https://github.com/mika-f/makit) deployment adapter for Netlify. It generates redirect and header rules — as TOML entries in `netlify.toml`, or as `_redirects`/`_headers` files — and can merge its managed block into an existing `netlify.toml` without overwriting the rest of the file.

```bash
pnpm add -D @natsuneko-laboratory/makit-adapter-netlify
```

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";
import netlify from "@natsuneko-laboratory/makit-adapter-netlify";

export default defineConfig({
  deployment: {
    adapter: netlify({
      redirects: { format: "toml" },
      headers: { format: "toml" },
    }),
  },
});
```

Run `makit adapter generate` to write the adapter's files, or `makit build`, which generates them as part of the build.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `generateConfig` | `true` | Write `netlify.toml` (or merge into an existing one) |
| `configPath` | `"netlify.toml"` | Path to the generated/merged config file |
| `redirects.format` | `"toml"` | `"toml"` writes redirects into the config file; `"file"` writes a `_redirects` file instead |
| `headers.format` | `"toml"` | `"toml"` writes headers into the config file; `"file"` writes a `_headers` file instead |
| `prettyUrls` | — | Reserved for future use |
| `i18nRouting` | `"client"` | `"native"` keeps language-conditioned redirects; `"client"` drops language conditions (client-side locale negotiation handles them instead) and reports a warning |

When `config.deployment.configFile.mode` is `"merge"`, the adapter preserves
unrelated content in an existing `netlify.toml` and replaces only its own
managed `# makit:start` / `# makit:end` block and the `[build]` section.

## Capabilities

Native redirects, conditional redirects, and custom headers are supported.
