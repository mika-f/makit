# `@natsuneko-laboratory/makit-theme-brutalist`

An official Makit theme for bold OSS projects, creative tools, and event
documentation. It uses high contrast, heavy rules, square geometry, offset
shadows, and signal color.

```bash
pnpm add @natsuneko-laboratory/makit-theme-brutalist
```

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  theme: {
    extends: "@natsuneko-laboratory/makit-theme-brutalist",
  },
});
```

## Defaults

- Accent: `signal`
- Radius: `none`
- Code theme: `github-light` / `github-dark`

Named accents are `signal`, `orange`, `lime`, `cyan`, `pink`, and `violet`.
Each includes a high-energy highlight color as well as accessible text colors
for light and dark backgrounds.

The theme intentionally enforces square corners on inherited interface
controls. Content inside `.makit-prose` is excluded, so authored HTML keeps its
own geometry.
