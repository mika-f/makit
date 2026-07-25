# Customizing

`theme.extends` and `theme.components` compose: the theme supplies the shell,
and individual slots can still be replaced on top of it.

## Replacing one slot

```ts title="makit.config.ts"
theme: {
  extends: "@natsuneko-laboratory/makit-theme-terminal",
  components: {
    Footer: "./theme/footer.tsx",
  },
}
```

Resolution runs in this order, first match winning:

1. `theme.components`
2. the `theme/` convention directory
3. `theme.extends`
4. Makit's standard theme

## Reusing the theme's own components

A replacement receives the resolved slot map, so it can compose the theme's
components rather than reimplementing them.

```tsx title="theme/docs-page.tsx"
import type { DocsPageProps } from "@natsuneko-laboratory/makit-runtime";

export default function DocsPage({ page, site, navigation, components: C }: DocsPageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <C.Header header={site.header} siteTitle={site.title} homeHref="/" />
      <main>
        <C.PageContent html={page.html} copyButton={site.markdown.code.copyButton} />
      </main>
    </div>
  );
}
```

`C.Header` here is the terminal theme's header, because that is what the slot
resolved to.

## Removing a slot

```ts title="makit.config.ts"
theme: {
  extends: "@natsuneko-laboratory/makit-theme-terminal",
  components: {
    PrevNextLinks: false,
  },
}
```

> [!WARNING]
> Structural slots — `RootLayout`, `DocsPage`, `Header`, `PageContent` — cannot
> be disabled. Setting one to `false` fails the build with
> `theme-slot-not-optional`.
