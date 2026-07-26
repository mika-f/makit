# Changelog pages

Point a page at a GitHub repository and Makit fills it with that repository's releases at build time. The release notes are merged into your Markdown before it is processed, so they get the same heading anchors, table of contents, syntax highlighting, and search indexing as anything you write by hand.

```md
---
title: Changelog
changelog: mika-f/makit
---

Every release of Makit.
```

The repository is written as `owner/repository`. A URL such as `https://github.com/mika-f/makit` is rejected with a build error.

## Choosing where the releases go

Without a marker, the releases are appended to the end of the page. Add `<!-- makit:changelog -->` to place them yourself.

```md
---
changelog: mika-f/makit
---

# Changelog

The latest releases are below.

<!-- makit:changelog -->

Older releases are on GitHub.
```

Only the first marker is replaced, and a marker inside a code fence is left alone.

## Filtering releases

Options other than the repository need a `.meta.ts` file, because YAML front matter only carries flat values.

```ts
import { definePageMetadata } from "@natsuneko-laboratory/makit/metadata";

export default definePageMetadata({
  id: "changelog",
  title: "Changelog",
  changelog: {
    repository: "mika-f/makit",
    limit: 20,
    prereleases: false,
    tagPattern: "^v",
    since: "2026-01-01",
    headingLevel: 2,
  },
});
```

| Option         | Default | Description                                                              |
| -------------- | ------- | ------------------------------------------------------------------------ |
| `repository`   | —       | GitHub repository in `owner/repository` form.                            |
| `limit`        | `30`    | Maximum number of releases to render (1–500).                            |
| `prereleases`  | `true`  | Whether pre-releases are included.                                        |
| `tagPattern`   | —       | Regular expression the tag name must match. Useful in a monorepo.         |
| `since`        | —       | ISO 8601 date; only releases published on or after it are rendered.      |
| `headingLevel` | `2`     | Heading level of each release (1–5).                                     |

Draft releases are never rendered. Filters are applied in the order above, and `limit` counts what survives them.

Releases are ordered by version, highest first — not by publication date. A `v` prefix and a package prefix such as `makit@` are ignored, missing components count as zero (`v1.2` equals `v1.2.0`), and a pre-release sits just below the release it leads to (`v2.0.0` > `v2.0.0-rc.2` > `v2.0.0-rc.1`). Tags with no readable version, such as `nightly`, come after the ones that have a version, newest first. Ordering happens before `limit`, so a page always keeps the highest versions.

Each release becomes a heading followed by a line with the tag link and the publication date, then the release body. Headings inside the release body are shifted down so they nest under the release's own heading, which keeps the table of contents readable.

## Site-wide defaults

`changelog` in `makit.config.ts` sets the defaults for every changelog page.

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  title: "My Documentation",
  changelog: {
    limit: 20,
    prereleases: false,
    dateStyle: "long",
    labels: {
      prerelease: { "en-US": "Pre-release", "ja-JP": "プレリリース" },
      empty: { "en-US": "No releases yet.", "ja-JP": "まだリリースがありません。" },
    },
  },
});
```

| Option         | Default                    | Description                                                             |
| -------------- | -------------------------- | ----------------------------------------------------------------------- |
| `enabled`      | `true`                     | `false` turns the feature off; pages then render their body only.       |
| `apiBaseUrl`   | `https://api.github.com`   | Change it for GitHub Enterprise Server.                                 |
| `token`        | —                          | Falls back to `MAKIT_GITHUB_TOKEN`, then `GITHUB_TOKEN`.                |
| `cacheTtl`     | `3600`                     | Seconds a fetched release list is reused. `0` revalidates every build.  |
| `offline`      | `false`                    | Never touch the network; `MAKIT_OFFLINE=1` does the same.               |
| `dateStyle`    | `"medium"`                 | `full`, `long`, `medium`, `short`, or `iso`.                            |
| `labels`       | English defaults           | Pre-release marker and the text shown when nothing matches.             |

Dates are formatted with the locale of the page they appear on, so a translated page shows its own date format even though the release notes themselves come straight from GitHub.

## Tokens and rate limits

The unauthenticated GitHub API allows 60 requests per hour per IP address, which is enough for a handful of repositories but not for a busy CI runner. Set `GITHUB_TOKEN` in the environment — GitHub Actions provides one automatically — rather than writing the token into `makit.config.ts`.

Release lists are cached under `.makit/cache/changelog/`, shared by every page and locale that names the same repository, and revalidated with an `ETag` once `cacheTtl` expires. `makit dev` does not poll for new releases; run `makit clean` to force a refresh.

## When GitHub is unreachable

A failed request never stops a build. Makit falls back to the cached release list if there is one, renders the `labels.empty` text if there is not, and reports a `changelog-fetch-failed` warning either way. Promote it if a stale changelog should fail your pipeline.

```ts
validation: {
  failOn: ["changelog-fetch-failed"],
},
```

A repository whose releases are all filtered out reports `changelog-empty` instead.

## Raw HTML in release notes

Release bodies often contain HTML such as `<img>` or `<details>`. Makit strips raw HTML by default, so those parts do not appear. Setting `markdown.allowDangerousHtml: true` renders them, but it also means anyone who can publish a release can inject HTML into your site — enable it only for repositories you control.
