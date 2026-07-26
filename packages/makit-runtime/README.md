# `@natsuneko-laboratory/makit-runtime`

React components and Next.js integration used by [Makit](https://github.com/mika-f/makit)'s generated `.makit/` app. It implements the Standard Theme — the default set of page and part slots documented in the theme specification — and provides the data loaders that read a build's generated content.

This package is an internal dependency of `@natsuneko-laboratory/makit` and its generated project; it is not installed directly in a typical Makit project. It is relevant when writing a **theme package** or replacing individual theme components, since a replacement component can import the Standard Theme's default implementation to wrap or recompose it.

```ts
import { Footer as DefaultFooter } from "@natsuneko-laboratory/makit-runtime";
import type { FooterProps } from "@natsuneko-laboratory/makit-runtime";

export default function Footer(props: FooterProps) {
  return <DefaultFooter {...props} />;
}
```

## Entry points

- `@natsuneko-laboratory/makit-runtime` — every theme slot's default component, Slot Props types, generated-data loaders, and theme/locale helpers. Only import **types** from this entry inside a Client Component; importing a value drags in the filesystem-backed data loaders.
- `@natsuneko-laboratory/makit-runtime/client` — React-free constants (`THEME_STORAGE_KEY`, `LOCALE_STORAGE_KEY`) safe to import from a Client Component.
- `@natsuneko-laboratory/makit-runtime/slot-names` — the list of theme slot names and file-name mappings, importable without pulling in React.

See the [theme specification](https://github.com/mika-f/makit/blob/main/docs/05-THEME.md) for the full slot list and the rules for writing a theme.
