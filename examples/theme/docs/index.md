# Makit Theme Example

Every visible difference from a default Makit site comes from the files in
`theme/` and `src/`, plus a few lines of `theme.components`.

## What is replaced here

| Component       | Where it lives           | How it was replaced                             |
| --------------- | ------------------------ | ----------------------------------------------- |
| `Header`        | `theme/header.tsx`       | Convention directory, wraps the built-in header |
| `PageHeader`    | `theme/page-header.tsx`  | Convention directory, replaced outright         |
| `ThemeToggle`   | `theme/theme-toggle.tsx` | Convention directory, a client component        |
| `Footer`        | `src/site-footer.tsx`    | `theme.components`, a named export              |
| `PrevNextLinks` | —                        | `theme.components: { PrevNextLinks: false }`    |

Everything else — the sidebar, breadcrumbs, search, table of contents — is
still Makit's own implementation.
