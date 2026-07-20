# 設定リファレンス

`makit.config.ts` はサイト全体に作用する設定です。すべて任意ですが、`title` だけは必須です。値を省略した場合は既定値が使われます。

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  title: "My Documentation",
  description: "プロジェクトのドキュメント",
  lang: "ja-JP",
  siteUrl: "https://docs.example.com",
  sourceDir: "docs",
  publicDir: "public",
  outDir: "dist",
  basePath: "/manual",
});
```

## 基本パス

| 項目          | 型・既定値           | 説明                                                                                                        |
| ------------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| `title`       | `string`、必須       | サイト名。SEO タイトルの既定値にも使います。                                                                |
| `description` | `string`             | サイト全体の説明。                                                                                          |
| `lang`        | `string`、`"en"`     | 単一言語サイトの文書言語。多言語では `i18n` を使います。                                                    |
| `siteUrl`     | `string`             | `https://docs.example.com` のような公開 URL。sitemap と canonical URL に必要です。末尾の `/` は付けません。 |
| `sourceDir`   | `string`、`"docs"`   | Markdown とメタデータを読むディレクトリ。                                                                   |
| `publicDir`   | `string`、`"public"` | そのまま配信する画像、favicon などのディレクトリ。                                                          |
| `outDir`      | `string`、`"dist"`   | `makit build` の出力先。                                                                                    |
| `basePath`    | `string`、`""`       | サイトをサブパスで公開する場合の接頭辞。`"manual"` と `"/manual/"` はどちらも `/manual` に正規化されます。  |

## 表示、テーマ、スタイル

```ts
export default defineConfig({
  title: "My Documentation",
  header: {
    logo: "/logo.svg",
    logoDark: "/logo-dark.svg",
    title: "My Docs",
    links: [{ label: "GitHub", href: "https://github.com/example/docs", external: true }],
  },
  footer: {
    copyright: "© 2026 Example",
    links: [{ label: "Status", href: "https://status.example.com", external: true }],
  },
  theme: {
    colorScheme: "system",
    accentColor: "violet",
    radius: "medium",
    breadcrumbs: { enabled: true, showHome: true, showCurrentPage: true },
    codeTheme: { light: "github-light", dark: "github-dark" },
  },
  styles: ["styles/custom.css"],
});
```

| 項目                       | 型・既定値                                             | 説明                                                               |
| -------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| `header.logo` / `logoDark` | `string`                                               | 明るい／暗いテーマ用ロゴの公開パス。                               |
| `header.title`             | `string`                                               | ヘッダーに表示する名前。                                           |
| `header.links`             | リンク配列                                             | `label`、`href`、必要なら `external: true` を指定します。          |
| `footer.copyright`         | `string`                                               | フッターの著作権表記。                                             |
| `footer.links`             | リンク配列                                             | フッターの補助リンク。                                             |
| `theme.colorScheme`        | `"light" \| "dark" \| "system"`、`"system"`            | 初期テーマ。`system` は OS の設定に従います。                      |
| `theme.accentColor`        | `string`                                               | アクセントカラー名または CSS カラー値。                            |
| `theme.radius`             | `"none" \| "small" \| "medium" \| "large"`、`"medium"` | UI の角丸の大きさ。                                                |
| `theme.breadcrumbs`        | object                                                 | `enabled`、`showHome`、`showCurrentPage` はすべて既定で `true`。   |
| `theme.codeTheme`          | `string` または `{ light, dark }`                      | コード表示の Shiki テーマ。既定は `github-light` / `github-dark`。 |
| `styles`                   | `string[]`                                             | プロジェクト内から読み込む追加 CSS。                               |

## Markdown

```ts
export default defineConfig({
  title: "My Documentation",
  markdown: {
    gfm: true,
    headingIds: true,
    externalLinks: { target: "_blank", rel: "noopener noreferrer" },
    code: { copyButton: true, lineNumbers: false },
    shiki: {
      themes: { light: "github-light", dark: "github-dark" },
      languages: ["ts", "tsx", "bash"],
      unknownLanguage: "warning",
    },
    tableOfContents: { minDepth: 2, maxDepth: 3 },
  },
});
```

| 項目                              | 型・既定値                                          | 説明                                                                                                    |
| --------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `gfm`                             | boolean、`true`                                     | 表、タスクリスト、取り消し線など GitHub Flavored Markdown を有効化します。                              |
| `headingIds`                      | boolean、`true`                                     | 見出しアンカーを生成します。                                                                            |
| `allowDangerousHtml`              | boolean、`false`                                    | 生 HTML を許可します。信頼できない入力には有効にしないでください。                                      |
| `externalLinks`                   | object                                              | 外部リンクの `target`（既定 `_blank`）と `rel`（既定 `noopener noreferrer`）。                          |
| `code.copyButton`                 | boolean、`true`                                     | コードブロックにコピー操作を表示します。                                                                |
| `code.lineNumbers`                | boolean、`false`                                    | すべてのコードブロックに行番号を表示します。                                                            |
| `shiki.theme`                     | `string`                                            | 明暗共通のテーマ。`themes` より優先されます。                                                           |
| `shiki.themes`                    | `{ light, dark }`                                   | 明暗別テーマ。                                                                                          |
| `shiki.languages`                 | `string[]`                                          | 追加で読み込む言語。                                                                                    |
| `shiki.unknownLanguage`           | `"error" \| "warning" \| "plain-text"`、`"warning"` | 未知のフェンス言語への対応。                                                                            |
| `tableOfContents`                 | object                                              | `minDepth`（既定 2）から `maxDepth`（既定 3）までを目次に含めます。                                     |
| `remarkPlugins` / `rehypePlugins` | plugin 配列                                         | Markdown 処理の前後に Unified プラグインを追加します。プラグインまたは `[plugin, options]` を渡します。 |

構文と表示の対応は[Markdown 構文](../03-guides/markdown-syntax.md)を参照してください。

## 多言語

```ts
export default defineConfig({
  title: "My Documentation",
  sourceDir: "docs",
  i18n: {
    defaultLocale: "en-US",
    locales: [
      { locale: "en-US", label: "English" },
      { locale: "ja-JP", label: "日本語", sourceDir: "docs/ja-jp" },
    ],
    fallback: { enabled: true, behavior: "render", showNotice: true },
    collectionFallback: { behavior: "render" },
    root: { behavior: "detect" },
    localeSwitcher: { missingPage: "fallback" },
    messages: { "ja-JP": { home: "ホーム", fallbackNotice: "翻訳を表示できません。" } },
  },
});
```

`defaultLocale` と `locales` は必須です。`sourceDir` を省略した locale は `<sourceDir>/<小文字の locale>`（例: `docs/ja-jp`）を読みます。URL でも locale は小文字になります。

| 項目                               | 説明                                                                                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `locales[].label` / `lang` / `dir` | 言語切替の表示名、HTML の言語、文章方向（`ltr` / `rtl`）。                                                                                      |
| `fallback`                         | 欠けたページの扱い。`render` は既定言語を表示、`redirect` はその URL へ移動、`not-found` は 404。boolean の `true` は有効、`false` は無効です。 |
| `collectionFallback.behavior`      | locale に Collection 自体がない場合の `render`、`redirect`、`hidden`、`not-found`。                                                             |
| `root.behavior`                    | `/` で既定 locale を開く `default`、ブラウザ言語を検出する `detect`、選択画面を出す `select`。`locale` で対象を指定できます。                   |
| `localeSwitcher.missingPage`       | 翻訳がないページで、フォールバックを開く `fallback`、locale のトップを開く `locale-root`、選択肢を出さない `disabled`。                         |
| `messages`                         | locale ごとの `home` と `fallbackNotice` を上書きします。                                                                                       |

## コンテンツとナビゲーション

```ts
export default defineConfig({
  title: "Portal",
  collections: { mode: "discover" },
  home: { layout: "portal", featuredCollections: ["api"] },
  navigation: {
    pagination: { enabled: true, crossSection: false },
    auto: { numericPrefixes: true, routeGroups: "url", unorderedPosition: "last" },
    global: [{ items: [{ title: "API", collection: "api" }] }],
  },
});
```

| 項目                                | 説明                                                                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `collections`                       | `defineCollection` の配列、または `collection.makit.ts` を探す `{ mode: "discover" }`。省略時は単一 Collection です。                                              |
| `home`                              | `layout: "page"` で `page` の ID をトップにするか、`"portal"` で Collection の入口を作ります。`featuredCollections` と `sections` は portal の表示順を指定します。 |
| `navigation.mode`                   | `"auto"`（既定）または `"manual"`。手動構造は `navigation.makit.ts` または `navigation.collections` で定義します。                                                 |
| `navigation.includeFallbackPages`   | 翻訳のフォールバックページをナビゲーションに含めるか。既定 `true`。                                                                                                |
| `navigation.global`                 | サイト共通リンク。項目は `href` または `collection` のどちらか一方を持てます。                                                                                     |
| `navigation.pagination`             | 前後ページリンク。`enabled` と、セクションをまたぐ `crossSection` は既定で `true`。                                                                                |
| `navigation.auto.numericPrefixes`   | `01-` のような接頭辞で自動順序を制御するか。既定 `true`。                                                                                                          |
| `navigation.auto.routeGroups`       | `(marketing)` のような括弧付きディレクトリを URL から除外するか。既定 `"url"` はサイドバー上のセクションとして残し、`"flatten"` はそのセクションも外して子ページを親の階層へ繰り上げ、`false` は Route Group 自体を無効化します。詳細は[コンテンツの整理](../03-guides/content-structure.md)を参照してください。 |
| `navigation.auto.unorderedPosition` | 接頭辞なしを `first` / `last`（既定）に置きます。                                                                                                                  |

ページ、カテゴリ、Collection、手動ナビゲーションの詳細は[メタデータ API](./metadata.md)を参照してください。

## SEO と生成物

## 本番限定の分析ツール

[本番限定の分析ツール](../03-guides/analytics.md)に、すべての `analytics` 設定とプロバイダーごとの導入方法をまとめています。

| 項目                           | 型・既定値                  | 説明                                                              |
| ------------------------------ | --------------------------- | ----------------------------------------------------------------- |
| `seo.titleTemplate`            | `string`、`"%s \| <title>"` | ページタイトルへ適用するテンプレート。`%s` がページタイトルです。 |
| `seo.defaultImage`             | `string`                    | ページ個別の `image` がないときの OG 画像。                       |
| `sitemap.enabled`              | boolean、`true`             | sitemap を生成します。`siteUrl` を設定してください。              |
| `sitemap.includeFallbackPages` | boolean、`false`            | 翻訳フォールバックページを sitemap に含めます。                   |
| `llms.enabled`                 | boolean、`false`            | `llms.txt`、`llms-full.txt`、各ページの Markdown を生成します。   |
| `github.repository`            | `owner/repository`          | ページの「GitHub で編集」リンクの対象リポジトリ。                 |
| `github.branch`                | `string`、`"main"`          | ドキュメントを置くブランチ。                                      |

## ビルド、開発、検証

| 項目                             | 型・既定値            | 説明                                                                                        |
| -------------------------------- | --------------------- | ------------------------------------------------------------------------------------------- |
| `build.clean`                    | boolean、`true`       | ビルド前に出力先をクリーンアップします。                                                    |
| `build.trailingSlash`            | boolean、`true`       | 生成 URL で末尾スラッシュを使います。                                                       |
| `dev.port` / `preview.port`      | number、`3000`        | 開発／プレビューサーバーのポート。                                                          |
| `dev.host` / `preview.host`      | string、`"localhost"` | 待受ホスト。                                                                                |
| `dev.open` / `preview.open`      | boolean、`false`      | 起動時にブラウザを開きます。                                                                |
| `dev.silentNext`                 | boolean、`false`      | 内部の Next.js 出力を抑制します。                                                           |
| `validation.strict`              | boolean、`false`      | 警告をエラーとして扱います。CI 向けです。                                                   |
| `validation.disallowFrontMatter` | boolean、`false`      | YAML front matter を禁止し、`.meta.ts` に統一します。既定では簡易 front matter を使えます。 |
| `validation.failOn`              | diagnostic code 配列  | 指定した警告だけをエラーへ昇格します。例: `["broken-link", "missing-anchor"]`。             |

Markdown の先頭に置く front matter は、`title`、`description`、`order` のようなページ単位のフラットな値を `.meta.ts` の代わりに指定できます。ネストした値やオブジェクトの配列は対象外で、同じページの `.meta.ts` と non-empty の front matter は併用できません。例と使い分けは[コンテンツの整理](../03-guides/content-structure.md)を参照してください。

## デプロイ、リダイレクト、ヘッダー

```ts
export default defineConfig({
  title: "My Documentation",
  deployment: {
    configFile: { mode: "generated" },
    redirects: true,
    headers: true,
    cleanUrls: true,
    customDomain: "docs.example.com",
  },
  redirects: [{ from: "/old/", to: "/new/", status: 308 }],
  headers: [
    { path: "/assets/*", headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  ],
});
```

| 項目                               | 説明                                                                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `deployment.adapter`               | ホスティング固有の Adapter。設定例と各オプションは[Adapter リファレンス](./adapters.md)を参照してください。                           |
| `deployment.configFile.mode`       | `generated`（既定・上書き）、`merge`（既存設定と統合）、`manual`（生成しない）。Adapter によって対応範囲が異なります。                |
| `deployment.redirects` / `headers` | リダイレクトの生成は既定で有効、カスタムヘッダーは既定で無効です。                                                                    |
| `deployment.cleanUrls`             | 拡張子なし URL のホスト側設定を要求します。                                                                                           |
| `deployment.customDomain`          | カスタムドメイン。対応 Adapter では設定ファイルも生成します。                                                                         |
| `deployment.generateCi`            | Adapter が CI を生成できる場合に有効化します。                                                                                        |
| `deployment.preview.enabled`       | Adapter 固有のプレビュー連携を有効化します。                                                                                          |
| `redirects`                        | `from`、`to`、`status`（`301` / `302` / `307` / `308`）を指定します。`conditions` に `language` / `country`、`force` も指定できます。 |
| `headers`                          | `{ path, headers }`。`headers` はレスポンスヘッダー名と値のオブジェクトです。                                                         |
