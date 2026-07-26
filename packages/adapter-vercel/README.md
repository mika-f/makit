# `@natsuneko-laboratory/makit-adapter-vercel`

An official [Makit](https://github.com/mika-f/makit) deployment adapter for Vercel. It generates `vercel.json` from your Makit config's redirects and header rules, and can merge its generated keys into an existing `vercel.json` without discarding unrelated settings.

```bash
pnpm add -D @natsuneko-laboratory/makit-adapter-vercel
```

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";
import vercel from "@natsuneko-laboratory/makit-adapter-vercel";

export default defineConfig({
  deployment: {
    adapter: vercel({
      cleanUrls: true,
    }),
  },
});
```

Run `makit adapter generate` to write the adapter's files, or `makit build`, which generates them as part of the build.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `generateConfig` | `true` | Write `vercel.json` (or merge into an existing one) |
| `configPath` | `"vercel.json"` | Path to the generated/merged config file |
| `cleanUrls` | `config.deployment.cleanUrls` | Sets `vercel.json`'s `cleanUrls` |
| `trailingSlash` | `config.build.trailingSlash` | Sets `vercel.json`'s `trailingSlash` |

When `config.deployment.configFile.mode` is `"merge"`, the adapter reads an
existing `vercel.json` and overlays its own generated keys on top, keeping
unrelated settings intact.

## Capabilities

Native redirects, conditional redirects, and custom headers are supported.
Redirect statuses are normalized to Vercel's `permanent`/`temporary`
semantics (301/308 vs. other statuses), and country-conditioned redirects are
reported as a warning during `makit check` since they cannot be represented
in `vercel.json`.
