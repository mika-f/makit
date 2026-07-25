# Replacing a component

A file in `theme/` named after a component replaces it — no configuration.
`theme/header.tsx` in this example wraps the built-in header:

```tsx
import { Header as DefaultHeader } from "@natsuneko-laboratory/makit-runtime";
import type { HeaderProps } from "@natsuneko-laboratory/makit-runtime";

export default function Header(props: HeaderProps) {
  return (
    <>
      <Banner>…</Banner>
      <DefaultHeader {...props} />
    </>
  );
}
```

## Wrapping versus replacing

`theme/page-header.tsx` goes the other way and renders its own markup, reading
the page's tags out of `page.taxonomy`. Both approaches use the same props
type; wrapping just forwards it along.

## Helper modules

`theme/banner.tsx` is not a component name, so Makit ignores it. Helper modules
can live next to the components that import them, and the Tailwind classes they
use are still compiled.

## Interactivity

`theme/theme-toggle.tsx` starts with `"use client"` and uses `useState`, which
is all a client component needs. Page-level components (`DocsPage`,
`RootLayout`, …) must stay on the server, but the smaller parts can be either.

Notice that this page has no previous/next links: `theme.components` sets
`PrevNextLinks: false`.
