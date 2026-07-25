# What a component can import

Components in this project are compiled as part of the generated site, and
Makit resolves these packages for you:

- `react`, `react-dom`
- `next` — `theme/banner.tsx` imports `next/link`
- `lucide-react`
- `@natsuneko-laboratory/makit-runtime` — every built-in component, its props
  type, and the data loaders

So `package.json` here depends on `@natsuneko-laboratory/makit` only. The
`devDependencies` exist purely so an editor can resolve the types:

```json
"devDependencies": {
  "@natsuneko-laboratory/makit-runtime": "workspace:*",
  "@types/react": "^19.2.17"
}
```

## Reading site data

Server components can call the loaders the runtime exports — `getCollections`,
`getGlobalNavigation`, `getSearchIndex` — to read the same generated data the
built-in components use.

## Styling

Tailwind classes in `theme/` and in any file named by `theme.components` are
compiled automatically. The `--makit-color-*` and `--makit-radius` variables
follow `theme.accentColor` and `theme.radius`, which is why the banner and the
toggle in this example pick up the teal accent without hardcoding it.
