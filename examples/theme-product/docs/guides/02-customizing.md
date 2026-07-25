# Customizing

`theme.extends` and `theme.components` compose: the theme supplies the shell,
and individual slots can still be replaced on top of it.

## Replacing one slot

```ts title="makit.config.ts"
theme: {
  extends: "@natsuneko-laboratory/makit-theme-product",
  components: {
    PageHeader: "./theme/page-header.tsx",
  },
}
```

Resolution runs in this order, first match winning:

1. `theme.components`
2. the `theme/` convention directory
3. `theme.extends`
4. Makit's standard theme

## Wrapping a component

A replacement can import the theme's own implementation and wrap it.

```tsx title="theme/footer.tsx"
import { Footer as ProductFooter } from "@natsuneko-laboratory/makit-theme-product";
import type { FooterProps } from "@natsuneko-laboratory/makit-runtime";

export default function Footer(props: FooterProps) {
  return (
    <>
      <ProductFooter {...props} />
      <p className="px-6 py-4 text-center text-xs">Built with Makit</p>
    </>
  );
}
```

Tailwind classes written in a replacement are compiled: Makit registers the
file with Tailwind's scanner automatically.

## Eyebrows

`PageHeader` reads the nearest ancestor from the page's canonical hierarchy
and renders it above the title. On this page that is **Guides**, taken from the
directory name — no configuration involved.
