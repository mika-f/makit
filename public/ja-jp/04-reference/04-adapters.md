# Adapter リファレンス

Adapter は、Makit の静的成果物を各ホスティングサービスへ合わせる設定ファイル、リダイレクト、ヘッダー、CI を生成します。Adapter は任意です。使わない場合は `dist/` を任意の静的ホスティングへ配置できます。

```bash
# 使用するサービスの Adapter だけを開発依存関係に追加します
pnpm add -D @natsuneko-laboratory/makit-adapter-github-pages
```

Adapter は文字列ではなくファクトリー関数の戻り値を `deployment.adapter` に指定します。

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";
import githubPages from "@natsuneko-laboratory/makit-adapter-github-pages";

export default defineConfig({
  title: "My Documentation",
  deployment: { adapter: githubPages() },
});
```

生成予定のファイルは `pnpm exec makit check` で確認し、生成だけを行うには `pnpm exec makit adapter generate` を実行します。トークンや秘密鍵を設定ファイルへ書かず、各サービスの環境変数または認証機構を使ってください。

## 共通の deployment 設定

| 項目              | 既定値        | 説明                                                                                               |
| ----------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| `configFile.mode` | `"generated"` | `generated` は Makit が管理、`merge` は既存設定と統合、`manual` はサービス設定を自分で管理します。 |
| `redirects`       | `true`        | `redirects` のルールを Adapter へ渡します。                                                        |
| `headers`         | `false`       | `headers` のルールを Adapter へ渡します。非対応サービスでは警告になります。                        |
| `cleanUrls`       | `false`       | 拡張子なし URL のホスト設定。Vercel が利用します。                                                 |
| `customDomain`    | —             | カスタムドメイン。GitHub Pages では `CNAME` の生成に使います。                                     |
| `generateCi`      | `false`       | CI を生成できる Adapter で使います。                                                               |

## Cloudflare Pages

```bash
pnpm add -D @natsuneko-laboratory/makit-adapter-cloudflare-pages
```

```ts
import cloudflarePages from "@natsuneko-laboratory/makit-adapter-cloudflare-pages";

export default defineConfig({
  title: "My Documentation",
  deployment: {
    adapter: cloudflarePages({
      projectName: "my-docs",
      generateWranglerConfig: true,
      redirects: { mode: "native" },
      headers: { enabled: true },
    }),
  },
});
```

| オプション               | 既定値     | 説明                                                                                                 |
| ------------------------ | ---------- | ---------------------------------------------------------------------------------------------------- |
| `projectName`            | —          | 生成する `wrangler.jsonc` の `name`。                                                                |
| `generateWranglerConfig` | `false`    | プロジェクト直下に `wrangler.jsonc` を生成します。出力先は `pages_build_output_dir` に設定されます。 |
| `redirects.mode`         | `"native"` | `native` は出力先の `_redirects`、`html` は各 URL の HTML リダイレクトを生成します。                 |
| `headers.enabled`        | `true`     | `headers` を出力先の `_headers` として生成します。                                                   |

Cloudflare Pages はネイティブなリダイレクトとカスタムヘッダーに対応します。

## GitHub Pages

```bash
pnpm add -D @natsuneko-laboratory/makit-adapter-github-pages
```

```ts
import githubPages from "@natsuneko-laboratory/makit-adapter-github-pages";

export default defineConfig({
  title: "My Documentation",
  deployment: {
    adapter: githubPages({
      repository: "owner/docs",
      siteType: "project",
      basePath: "auto",
      generateWorkflow: true,
      branch: "main",
    }),
  },
});
```

| オプション         | 既定値                               | 説明                                                                                           |
| ------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `repository`       | —                                    | `owner/repository`。`"auto"` は `GITHUB_REPOSITORY` または Git の `origin` から解決します。    |
| `siteType`         | `"project"`                          | `project` は `https://owner.github.io/repository/`、`user` / `organization` はルート公開です。 |
| `basePath`         | —                                    | URL の接頭辞。`"auto"` では project site のリポジトリ名を使います。                            |
| `customDomain`     | —                                    | 独自ドメイン。出力先に `CNAME` を生成し、`basePath` は空でなければなりません。                 |
| `generateWorkflow` | `deployment.generateCi`              | GitHub Actions のワークフローを生成します。                                                    |
| `workflowPath`     | `.github/workflows/deploy-makit.yml` | 生成するワークフローの場所。                                                                   |
| `branch`           | `"main"`                             | ワークフローを実行するブランチ。                                                               |

`.nojekyll` と HTML リダイレクトを出力します。GitHub Pages はカスタムレスポンスヘッダーをサポートしないため、`headers` は警告になります。条件付きリダイレクトも無条件 HTML リダイレクトへ変換されます。

## Netlify

```bash
pnpm add -D @natsuneko-laboratory/makit-adapter-netlify
```

```ts
import netlify from "@natsuneko-laboratory/makit-adapter-netlify";

export default defineConfig({
  title: "My Documentation",
  deployment: {
    configFile: { mode: "merge" },
    adapter: netlify({
      generateConfig: true,
      configPath: "netlify.toml",
      redirects: { format: "toml" },
      headers: { format: "toml" },
      i18nRouting: "native",
    }),
  },
});
```

| オプション         | 既定値           | 説明                                                                                                            |
| ------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `generateConfig`   | `true`           | `netlify.toml` を生成します。                                                                                   |
| `configPath`       | `"netlify.toml"` | 設定ファイルの場所。                                                                                            |
| `redirects.format` | `"toml"`         | `toml` は `netlify.toml`、`file` は出力先の `_redirects` を使います。                                           |
| `headers.format`   | `"toml"`         | `toml` は `netlify.toml`、`file` は出力先の `_headers` を使います。                                             |
| `i18nRouting`      | `"client"`       | `client` は言語条件を出力せずブラウザ側に任せます。`native` は Netlify の言語条件付きリダイレクトを出力します。 |

`configFile.mode: "merge"` の場合、Adapter は既存の `netlify.toml` に `# makit:start` / `# makit:end` の管理ブロックを作り、既存の独自設定を保持します。

## Vercel

```bash
pnpm add -D @natsuneko-laboratory/makit-adapter-vercel
```

```ts
import vercel from "@natsuneko-laboratory/makit-adapter-vercel";

export default defineConfig({
  title: "My Documentation",
  build: { trailingSlash: true },
  deployment: {
    cleanUrls: true,
    adapter: vercel({
      generateConfig: true,
      configPath: "vercel.json",
      cleanUrls: true,
      trailingSlash: true,
    }),
  },
});
```

| オプション       | 既定値                 | 説明                                                              |
| ---------------- | ---------------------- | ----------------------------------------------------------------- |
| `generateConfig` | `true`                 | `vercel.json` を生成します。                                      |
| `configPath`     | `"vercel.json"`        | 設定ファイルの場所。                                              |
| `cleanUrls`      | `deployment.cleanUrls` | Vercel の `cleanUrls` を設定します。                              |
| `trailingSlash`  | `build.trailingSlash`  | Vercel の `trailingSlash` を設定し、Makit の URL 形式と揃えます。 |

リダイレクトとヘッダーは `vercel.json` に変換されます。301 は Vercel の恒久リダイレクト（308）、302 は一時リダイレクト（307）の意味で表されます。国コード条件は Vercel 設定で表現できないため警告されます。

## Adapter を選ぶ目安

| サービス         | リダイレクト             | ヘッダー | CI の生成 | 注意点                                             |
| ---------------- | ------------------------ | -------- | --------- | -------------------------------------------------- |
| Cloudflare Pages | ネイティブまたは HTML    | 対応     | —         | 必要なら `wrangler.jsonc` を生成。                 |
| GitHub Pages     | HTML                     | 非対応   | 対応      | project site では `basePath: "auto"` が便利。      |
| Netlify          | ネイティブ、条件付き対応 | 対応     | —         | TOML または `_redirects` / `_headers` を選べます。 |
| Vercel           | ネイティブ               | 対応     | —         | URL 形式を `trailingSlash` で揃えます。            |
