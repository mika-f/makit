# Configuration reference

`makit.config.ts` controls the whole site. Only `title` is required; omitted options use the defaults shown below.

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  title: "My Documentation",
  description: "Documentation for my project.",
  lang: "en-US",
  siteUrl: "https://docs.example.com",
  sourceDir: "docs",
  publicDir: "public",
  outDir: "dist",
  basePath: "/manual",
});
```

## Core paths

| Option                               | Default                          | Description                                                                                       |
| ------------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------- |
| `title`                              | required                         | Site name and the SEO-title default.                                                              |
| `description`                        | —                                | Site-wide description.                                                                            |
| `lang`                               | `"en"`                           | Document language for a single-locale site.                                                       |
| `siteUrl`                            | —                                | Public `https://…` URL for canonical URLs and sitemap generation.                                 |
| `sourceDir` / `publicDir` / `outDir` | `"docs"` / `"public"` / `"dist"` | Content source, static assets, and build output directories.                                      |
| `basePath`                           | `""`                             | Subpath for a site such as `/manual`; it is normalized to a leading slash with no trailing slash. |

## Display and theme

```ts
theme: {
  colorScheme: "system",
  accentColor: "violet",
  radius: "medium",
  breadcrumbs: { enabled: true, showHome: true, showCurrentPage: true },
  codeTheme: { light: "github-light", dark: "github-dark" },
},
header: { logo: "/logo.svg", logoDark: "/logo-dark.svg", title: "My Docs", links: [] },
footer: { copyright: "© 2026 Example", links: [] },
styles: ["styles/custom.css"],
```

`header.links` and `footer.links` use `{ label, href, external? }`. `colorScheme` is `light`, `dark`, or `system` (default); `radius` is `none`, `small`, `medium` (default), or `large`. Breadcrumb fields default to `true`, and `codeTheme` defaults to GitHub light/dark themes.

## Markdown

```ts
markdown: {
  gfm: true,
  headingIds: true,
  allowDangerousHtml: false,
  externalLinks: { target: "_blank", rel: "noopener noreferrer" },
  code: { copyButton: true, lineNumbers: false },
  shiki: { themes: { light: "github-light", dark: "github-dark" }, languages: ["ts"], unknownLanguage: "warning" },
  tableOfContents: { minDepth: 2, maxDepth: 3 },
},
```

| Option                                | Default                         | Description                                                                                                                                            |
| ------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `gfm`, `headingIds`                   | `true`                          | Enable GFM and heading anchors.                                                                                                                        |
| `allowDangerousHtml`                  | `false`                         | Allow raw HTML only for trusted content.                                                                                                               |
| `externalLinks`                       | `_blank`, `noopener noreferrer` | Target and `rel` applied to external links.                                                                                                            |
| `code.copyButton`, `code.lineNumbers` | `true`, `false`                 | Show the copy control and global line numbers.                                                                                                         |
| `shiki.theme` / `themes`              | GitHub themes                   | One shared theme or `{ light, dark }`; `theme` wins. `languages` adds grammars and `unknownLanguage` is `error`, `warning` (default), or `plain-text`. |
| `tableOfContents`                     | H2–H3                           | Heading range; depths are 1–6.                                                                                                                         |
| `remarkPlugins`, `rehypePlugins`      | `[]`                            | Unified plugins or `[plugin, options]` entries.                                                                                                        |

See [Markdown syntax](../03-guides/markdown-syntax.md) for source and rendering examples.

## Localization and navigation

`i18n` requires `defaultLocale` and `locales`. A locale has `locale`, plus optional `label`, `lang`, `dir`, and `sourceDir`; an omitted source directory is `<sourceDir>/<lowercase locale>`.

```ts
i18n: {
  defaultLocale: "en-US",
  locales: [{ locale: "en-US", label: "English" }, { locale: "ja-JP", label: "日本語" }],
  fallback: { enabled: true, behavior: "render", showNotice: true },
  collectionFallback: { behavior: "render" },
  root: { behavior: "detect" },
  localeSwitcher: { missingPage: "fallback" },
  messages: { "ja-JP": { home: "ホーム" } },
},
```

Fallback behavior is `render`, `redirect`, or `not-found`; a missing collection can also be `hidden`. Root behavior is `default`, `detect`, or `select`; a missing-page locale switcher may use `fallback`, `locale-root`, or `disabled`.

`collections` accepts explicit collection metadata or `{ mode: "discover" }`. `home` chooses a `page` or `portal` layout. `navigation` controls automatic/manual navigation, global links, fallback pages, pagination, numeric filename prefixes, and route groups. `navigation.auto.numericPrefixes` defaults to `true`, and unprefixed items default to `last`. A directory wrapped in parentheses, such as `(marketing)`, is never included in the URL; `navigation.auto.routeGroups` controls how it affects the sidebar — `"url"` (default) keeps it as its own section, `"flatten"` removes that section and promotes its pages into the parent level, and `false` disables route groups entirely. See [Content structure](../03-guides/content-structure.md#route-groups) for an example.

## SEO, build, and validation

## Production analytics

See [Production analytics](../03-guides/analytics.md) for all `analytics` options and provider-specific setup.

| Option                               | Default                                      | Description                                                                                                               |
| ------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `seo.titleTemplate`                  | `"%s                                         | <site title>"`                                                                                                            | Page-title template; `seo.defaultImage` is the fallback social image. |
| `sitemap.enabled`                    | `true`                                       | Generate sitemap; fallback pages are excluded by default.                                                                 |
| `llms.enabled`                       | `false`                                      | Generate `llms.txt`, `llms-full.txt`, and page Markdown endpoints.                                                        |
| `github`                             | —                                            | `{ repository: "owner/repository", branch?: "main" }` for Edit-on-GitHub links.                                           |
| `build.clean`, `build.trailingSlash` | `true`, `true`                               | Clean output and choose trailing-slash URLs.                                                                              |
| `dev` / `preview`                    | port `3000`, host `localhost`, `open: false` | Local server options; `dev.silentNext` suppresses internal output.                                                        |
| `validation.strict`                  | `false`                                      | Promote warnings to errors. `disallowFrontMatter` forbids YAML front matter; `failOn` promotes selected diagnostic codes. |

By default, lightweight YAML front matter may replace `.meta.ts` for flat page values such as `title`, `description`, or `order`. It does not support nested values or arrays of objects, and it cannot be combined with non-empty front matter and a `.meta.ts` file for the same page. See [Content structure](../03-guides/content-structure.md#use-lightweight-front-matter) for an example and selection guidance.

## Deployment

`deployment` configures an Adapter, config-file ownership (`generated`, `merge`, or `manual`), redirects, headers, clean URLs, custom domains, generated CI, and adapter previews. Site-level `redirects` entries use `{ from, to, status }` with 301, 302, 307, or 308; `headers` entries use `{ path, headers }`. See the [Adapter reference](./adapters.md) for provider-specific options.
