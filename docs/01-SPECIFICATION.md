# Makit 仕様書

## 1. 文書情報

* プロダクト名: Makit
* 種別: オープンソースソフトウェア
* 形式: Node.js CLI アプリケーション
* 想定ライセンス: MIT License
* 仕様バージョン: 0.1
* 想定ステータス: MVP設計
* CLIコマンド: `makit`
* 設定ファイル: `makit.config.ts`

---

# 2. 概要

Makit は、Markdown ファイルから静的なドキュメントサイトを生成するための CLI アプリケーションである。

利用者は Markdown ファイルと `makit.config.ts` を管理し、Next.js アプリケーションを直接作成・保守する必要はない。

Makit はプロジェクト内の `.makit/` ディレクトリに内部用の Next.js アプリケーションを生成し、そのアプリケーションを利用して開発サーバーおよび静的ビルドを提供する。

主な技術構成は以下とする。

* Next.js App Router
* Next.js Static Export
* React
* remark
* rehype
* Shiki
* Tailwind CSS
* TypeScript

---

# 3. 目的

Makit は次の目的を持つ。

1. Markdown からドキュメントサイトを簡単に生成できること
2. 利用者に Next.js 固有の構成を意識させないこと
3. 静的ホスティング環境へ配置可能な成果物を生成すること
4. ドキュメントの見た目や構成を設定ファイルに集約すること
5. 多言語ドキュメントを標準機能として扱えること
6. 既存ドキュメントサイトから段階的に移行できること
7. プラグインやテーマによって将来的に拡張できること
8. ドキュメントの不整合をビルド時に検出できること

---

# 4. 非目標

Makit は、少なくとも初期バージョンでは以下を目的としない。

* 動的なWebアプリケーションの構築
* サーバーサイド認証
* データベース接続
* CMSとしての利用
* Next.jsアプリケーションの汎用ラッパー
* 任意のNext.js設定を完全に公開すること
* Markdown編集用の管理画面
* ホスティングサービスの提供
* ブラウザ上でのドキュメント編集
* 実行時にページを生成すること

---

# 5. 設計原則

## 5.1 設定中心

サイト構成、ナビゲーション、国際化、テーマ、Markdown処理、出力設定は、可能な限り `makit.config.ts` に集約する。

## 5.2 Next.jsの隠蔽

Next.js は内部レンダリング基盤として使用する。

利用者に以下を要求しない。

* `app/` ディレクトリの管理
* `next.config.ts` の管理
* Next.jsのルーティング実装
* `generateStaticParams` の実装
* Next.js用のTailwind設定
* Next.js用のビルドスクリプト

## 5.3 静的出力

本番成果物は静的HTML、CSS、JavaScriptおよびアセットとして出力する。

成果物は以下のような環境へ配置可能であること。

* GitHub Pages
* Cloudflare Pages
* Vercel
* Netlify
* Amazon S3
* 任意の静的Webサーバー

## 5.4 再生成可能性

`.makit/` は Makit が完全に再生成できる中間ディレクトリとする。

`.makit/` 内の手動編集は保証されず、次回実行時に上書きまたは削除される可能性がある。

## 5.5 ビルド時処理

Markdownの収集、解析、コードハイライト、リンク検証、フォールバック生成などは、原則としてビルド時または開発サーバー起動前に行う。

## 5.6 公開APIの安定性

`makit.config.ts`、Front Matter、およびプラグインAPIは公開APIとして扱う。

Next.js、remark、Shikiなどの内部APIをそのまま公開することは避け、Makit独自の安定した抽象化を提供する。

---

# 6. システム構成

Makit は、概念上以下の層で構成する。

```text
User Project
    ↓
Makit CLI
    ↓
Makit Core
    ├── Config Loader
    ├── Source Scanner
    ├── Markdown Processor
    ├── Route Generator
    ├── I18n Resolver
    ├── Navigation Generator
    ├── Link Validator
    └── Build Orchestrator
    ↓
Generated Data
    ↓
Makit Runtime
    ↓
Generated Next.js Application
    ↓
Static Output
```

---

# 7. プロジェクト構成

標準的なプロジェクト構成は以下とする。

```text
my-documentation/
├── docs/
│   ├── en-us/
│   │   ├── index.md
│   │   ├── getting-started.md
│   │   └── guides/
│   │       └── configuration.md
│   └── ja-jp/
│       ├── index.md
│       ├── getting-started.md
│       └── guides/
│           └── configuration.md
├── public/
│   ├── logo.svg
│   └── images/
├── styles/
│   └── custom.css
├── makit.config.ts
├── package.json
└── .gitignore
```

Makit実行後は以下が生成される。

```text
my-documentation/
├── .makit/
│   ├── app/
│   ├── cache/
│   ├── generated/
│   ├── public/
│   ├── runtime/
│   ├── next.config.mjs
│   ├── package.json
│   └── tsconfig.json
├── dist/
├── docs/
├── public/
├── styles/
└── makit.config.ts
```

---

# 8. 生成ディレクトリ

## 8.1 `.makit/`

Next.jsアプリケーションと中間生成物を格納する。

`.gitignore` への追加を推奨し、`makit init` が自動的に追加する。

## 8.2 `.makit/app/`

Next.js App Router のエントリーポイントを格納する。

概念構成:

```text
.makit/app/
├── layout.tsx
├── page.tsx
├── not-found.tsx
└── [locale]/
    ├── layout.tsx
    └── [[...slug]]/
        └── page.tsx
```

国際化を使用しない場合も、内部的には単一ロケールとして処理できる構造とする。

## 8.3 `.makit/generated/`

Markdown、設定、ナビゲーションなどから生成されたデータを格納する。

```text
.makit/generated/
├── manifest.json
├── site.json
├── locales.json
├── navigation/
│   ├── en-us.json
│   └── ja-jp.json
└── pages/
    ├── en-us/
    └── ja-jp/
```

## 8.4 `.makit/cache/`

解析結果やコードハイライト結果などを格納する。

## 8.5 `.makit/public/`

利用者の `public/` と、Makitが生成した静的アセットを格納する。

## 8.6 `dist/`

最終的な静的ビルド成果物を格納する。

出力先は設定で変更可能とする。

---

# 9. CLI仕様

## 9.1 共通形式

```bash
makit <command> [options]
```

共通オプション:

```text
--config <path>       設定ファイルを指定
--cwd <path>          プロジェクトルートを指定
--verbose             詳細ログを表示
--silent              エラー以外を表示しない
--log-format <format> ログ形式を指定
--version             バージョンを表示
--help                ヘルプを表示
```

`--log-format` の候補:

* `pretty`
* `json`

標準値は `pretty` とする。

---

## 9.2 `makit init`

新しいMakitプロジェクトを初期化する。

```bash
makit init
```

ディレクトリを指定できる。

```bash
makit init my-docs
```

生成内容:

* `makit.config.ts`
* `docs/`
* `docs/index.md` またはロケール別トップページ
* `public/`
* `.gitignore`
* 必要に応じて `package.json`

オプション候補:

```text
--locale <locale>
--package-manager <npm|pnpm|yarn|bun>
--force
--skip-install
```

既存ファイルを破壊する場合は、`--force` がない限りエラーとする。

---

## 9.3 `makit dev`

開発サーバーを起動する。

```bash
makit dev
```

処理:

1. プロジェクトルートを解決
2. 設定ファイルを読み込む
3. 設定を検証
4. Markdownを収集
5. ページとルートを生成
6. `.makit/` を生成または更新
7. Next.js開発サーバーを起動
8. 対象ファイルを監視
9. 変更に応じて再生成

オプション:

```text
--port <number>
--host <hostname>
--open
--no-open
```

標準値:

```text
port: 3000
host: localhost
open: false
```

設定ファイル変更時は、原則として全ページを再解析する。

Markdown変更時は、変更されたページと影響を受けるナビゲーション、リンク、検索索引のみを再生成することを目標とする。

MVPでは全ページ再生成を許容する。

---

## 9.4 `makit build`

本番用の静的サイトを生成する。

```bash
makit build
```

処理:

1. 設定ファイルを読み込む
2. 設定を検証
3. ソースを収集
4. Markdownを解析
5. 翻訳ページを対応付ける
6. フォールバックページを生成
7. ナビゲーションを生成
8. 内部リンクを検証
9. `.makit/` を生成
10. Next.jsビルドを実行
11. Static Exportを生成
12. 成果物を `outDir` へ配置
13. ビルド結果を報告

オプション:

```text
--clean
--no-clean
--strict
--profile
```

`--strict` 指定時は、一部の警告をエラーとして扱う。

---

## 9.5 `makit preview`

生成済みの静的サイトをローカルで配信する。

```bash
makit preview
```

対象は `outDir` とする。

Next.js開発サーバーは使用せず、静的ファイルサーバーを使用する。

オプション:

```text
--port <number>
--host <hostname>
--open
```

---

## 9.6 `makit clean`

生成物を削除する。

```bash
makit clean
```

標準削除対象:

* `.makit/`
* `outDir`

オプション:

```text
--cache-only
--generated-only
--all
```

---

## 9.7 `makit check`

ビルドを行わず、設定およびドキュメントを検証する。

```bash
makit check
```

検証対象:

* 設定ファイル
* Front Matter
* 重複ルート
* 重複ページID
* 内部リンク
* ナビゲーション
* 翻訳対応
* 不明なコード言語
* 必須アセット
* SEO情報

CIで利用可能な終了コードを返す。

---

# 10. 設定ファイル

設定ファイル名は標準で `makit.config.ts` とする。

次の形式で記述する。

```ts
import { defineConfig } from "makit";

export default defineConfig({
  title: "My Documentation",
});
```

`defineConfig` は型補完を提供し、設定値を返す関数とする。

以下の設定ファイル候補を読み込み可能とする。

```text
makit.config.ts
makit.config.mts
makit.config.js
makit.config.mjs
```

優先順位は上記の順とする。

複数存在する場合はエラーまたは警告とする。

---

# 11. 設定型

```ts
export interface MakitConfig {
  title: string;
  description?: string;
  lang?: string;
  siteUrl?: string;

  sourceDir?: string;
  publicDir?: string;
  outDir?: string;
  basePath?: string;

  i18n?: MakitI18nConfig;

  navigation?: NavigationConfig;
  header?: HeaderConfig;
  footer?: FooterConfig;

  theme?: ThemeConfig;
  markdown?: MarkdownConfig;
  styles?: string[];

  seo?: SeoConfig;
  sitemap?: SitemapConfig;

  build?: BuildConfig;
  dev?: DevConfig;
  preview?: PreviewConfig;

  validation?: ValidationConfig;
  experimental?: ExperimentalConfig;
}
```

---

# 12. 基本設定

```ts
export default defineConfig({
  title: "Makit Documentation",
  description: "Documentation powered by Makit",
  lang: "en-US",
  siteUrl: "https://docs.example.com",

  sourceDir: "docs",
  publicDir: "public",
  outDir: "dist",
  basePath: "",
});
```

初期値:

```ts
{
  lang: "en",
  sourceDir: "docs",
  publicDir: "public",
  outDir: "dist",
  basePath: ""
}
```

## 12.1 `title`

サイト全体の名称。

必須とする。

## 12.2 `description`

サイト全体の説明。

SEO、OGP、トップページなどで使用する。

## 12.3 `lang`

国際化を使用しない場合のHTML `lang` 属性。

## 12.4 `siteUrl`

本番サイトの絶対URL。

以下に使用する。

* canonical URL
* OGP
* サイトマップ
* RSS
* `hreflang`
* 絶対URL生成

開発時は省略可能とする。

## 12.5 `basePath`

サブディレクトリ配信時の基底パス。

例:

```ts
basePath: "/makit"
```

生成URL:

```text
/makit/en-us/getting-started/
```

先頭に `/` を付け、末尾には `/` を付けない形式へ正規化する。

---

# 13. Markdownソース

## 13.1 基本構造

国際化を使用しない場合:

```text
docs/
├── index.md
├── getting-started.md
└── guides/
    └── configuration.md
```

国際化を使用する場合:

```text
docs/
├── en-us/
│   ├── index.md
│   └── getting-started.md
└── ja-jp/
    ├── index.md
    └── getting-started.md
```

## 13.2 対応拡張子

MVPでは以下を対応対象とする。

* `.md`
* `.markdown`

MDXは初期実装に含めない。

## 13.3 除外規則

以下を標準で無視する。

* `node_modules`
* `.git`
* `.makit`
* `outDir`
* ファイル名が `.` で始まるファイル
* 設定で除外されたパス

将来的に `include` および `exclude` globを提供する。

---

# 14. Front Matter

YAML Front Matter を標準対応とする。

```md
---
id: getting-started
title: Getting Started
description: Learn how to use Makit.
slug: getting-started
order: 10
draft: false
sidebar: true
tableOfContents: true
---

# Getting Started
```

型:

```ts
export interface PageFrontMatter {
  id?: string;
  title?: string;
  description?: string;
  slug?: string | string[];
  order?: number;

  draft?: boolean;
  hidden?: boolean;

  sidebar?: boolean;
  tableOfContents?: boolean;

  layout?: string;

  canonical?: string;
  image?: string;

  noindex?: boolean;
  nofollow?: boolean;

  navigation?: {
    title?: string;
    group?: string;
  };
}
```

## 14.1 `id`

翻訳間でページを対応付ける安定した識別子。

同一ロケール内では一意でなければならない。

異なるロケールで同じ `id` を持つページは、同一内容の翻訳として扱う。

## 14.2 `title`

ページタイトル。

省略時は以下の順で推定する。

1. 最初のH1
2. ファイル名
3. ページID

## 14.3 `slug`

URLを明示的に指定する。

文字列またはセグメント配列を許可する。

```yaml
slug: getting-started
```

```yaml
slug:
  - guides
  - configuration
```

## 14.4 `draft`

`true` のページは、本番ビルドから除外する。

開発サーバーでは表示し、ドラフト表示であることを示す。

## 14.5 `hidden`

ページは生成するが、自動ナビゲーションには含めない。

## 14.6 `order`

自動ナビゲーションにおける並び順。

数値が小さいものを先に表示する。

---

# 15. ルーティング

## 15.1 基本変換

```text
docs/index.md
→ /

docs/getting-started.md
→ /getting-started/

docs/guides/index.md
→ /guides/

docs/guides/configuration.md
→ /guides/configuration/
```

国際化使用時:

```text
docs/en-us/index.md
→ /en-us/

docs/en-us/getting-started.md
→ /en-us/getting-started/
```

## 15.2 末尾スラッシュ

標準では末尾スラッシュを有効とする。

```text
/getting-started/
```

設定:

```ts
build: {
  trailingSlash: true,
}
```

## 15.3 重複ルート

以下のような重複はビルドエラーとする。

```text
docs/guides.md
docs/guides/index.md
```

両方が `/guides/` を生成するためである。

## 15.4 動的ルート

利用者が動的ルートを定義する機能は提供しない。

すべてのページURLはビルド時に確定しなければならない。

---

# 16. 国際化

## 16.1 基本要件

Makit は以下を標準対応する。

* ロケール接頭辞付きURL
* ロケール別ソースディレクトリ
* デフォルトロケール
* 翻訳欠損時のフォールバック
* 言語切り替え
* ロケール別ナビゲーション
* `lang` および `dir`
* canonical URL
* `hreflang`
* ロケール別サイトマップ
* ブラウザ言語検出
* ページIDによる翻訳対応

URL例:

```text
/ja-jp/
/ja-jp/getting-started/
/en-us/
/en-us/getting-started/
```

## 16.2 設定

```ts
i18n: {
  defaultLocale: "en-US",

  locales: [
    {
      locale: "en-US",
      label: "English",
    },
    {
      locale: "ja-JP",
      label: "日本語",
    },
  ],

  fallback: {
    enabled: true,
    behavior: "render",
    showNotice: true,
  },

  root: {
    behavior: "detect",
  },

  localeSwitcher: {
    missingPage: "fallback",
  },
}
```

型:

```ts
export interface MakitI18nConfig {
  defaultLocale: string;
  locales: MakitLocaleConfig[];

  fallback?: boolean | MakitLocaleFallbackConfig;

  root?: {
    behavior?: "default" | "detect" | "select";
    locale?: string;
  };

  localeSwitcher?: {
    missingPage?: "fallback" | "locale-root" | "disabled";
  };

  messages?: Record<string, Partial<MakitMessages>>;
}
```

ロケール型:

```ts
export interface MakitLocaleConfig {
  locale: string;
  label?: string;
  lang?: string;
  dir?: "ltr" | "rtl";
  sourceDir?: string;
}
```

## 16.3 ロケール正規化

設定ではBCP 47形式を推奨する。

```text
ja-JP
en-US
zh-Hant-TW
```

URLでは小文字へ正規化する。

```text
ja-JP → ja-jp
en-US → en-us
zh-Hant-TW → zh-hant-tw
```

正規化後に重複するロケールはエラーとする。

## 16.4 デフォルトロケール

`defaultLocale` は必ず `locales` に含まれていなければならない。

翻訳欠損時の標準フォールバック元として使用する。

## 16.5 ソースディレクトリ

標準規則:

```text
{sourceDir}/{normalizedLocale}/
```

ロケール単位で上書き可能とする。

```ts
locales: [
  {
    locale: "en-US",
    sourceDir: "documentation/en",
  },
  {
    locale: "ja-JP",
    sourceDir: "documentation/ja",
  },
]
```

## 16.6 ページ対応

翻訳ページは以下の優先順位で対応付ける。

1. Front Matterの `id`
2. 正規化された相対ルート
3. ソースディレクトリからの相対ファイルパス

`id` の使用を推奨する。

英語:

```md
---
id: configuration
slug: configuration
title: Configuration
---
```

日本語:

```md
---
id: configuration
slug: settings
title: 設定
---
```

生成URL:

```text
/en-us/configuration/
/ja-jp/settings/
```

## 16.7 フォールバック

翻訳が存在しない場合、デフォルトロケールのコンテンツを利用できる。

英語版のみ存在する場合:

```text
docs/en-us/guides/deployment.md
```

フォールバック有効時は以下も生成する。

```text
/ja-jp/guides/deployment/
```

フォールバックは実行時ではなくビルド時に解決する。

## 16.8 フォールバック方式

### `render`

要求されたロケールのURLを維持し、デフォルトロケールの本文を表示する。

```text
/ja-jp/guides/deployment/
```

URLは日本語のまま、内容は英語版となる。

標準動作とする。

### `redirect`

デフォルトロケールのページへ遷移する静的ページを生成する。

```text
/ja-jp/guides/deployment/
→ /en-us/guides/deployment/
```

HTTPリダイレクトではなく、静的HTML上の遷移となる。

### `not-found`

翻訳が存在しないURLを生成しない。

## 16.9 フォールバック通知

`render` の場合、別言語を表示していることを通知できる。

例:

```text
このページは日本語に翻訳されていないため、英語版を表示しています。
```

メッセージはロケール別に上書き可能とする。

## 16.10 ルートURL

`/` の動作は以下から選択する。

### `default`

デフォルトロケールへ静的遷移する。

```text
/ → /en-us/
```

### `detect`

ブラウザの言語設定をクライアント側で検出する。

判定順:

1. 保存済み言語
2. `navigator.languages` の完全一致
3. 言語部分の一致
4. デフォルトロケール

### `select`

言語選択ページを表示する。

JavaScriptが無効な場合でも、手動選択リンクを表示する。

## 16.11 言語切り替え

同一ページIDを持つ翻訳が存在する場合、そのページへ移動する。

翻訳が存在しない場合の動作:

* `fallback`
* `locale-root`
* `disabled`

## 16.12 フォールバックページのSEO

フォールバックページのcanonical URLは、実際のコンテンツ元へ向ける。

例:

```text
表示URL:
/ja-jp/guides/deployment/

canonical:
/en-us/guides/deployment/
```

フォールバックページは標準では以下から除外する。

* `hreflang`
* サイトマップ
* 検索エンジン向け翻訳ページ一覧

---

# 17. ナビゲーション

## 17.1 自動生成

```ts
navigation: {
  mode: "auto",
}
```

以下を基に生成する。

* ディレクトリ構造
* Front Matterの `title`
* Front Matterの `order`
* Front Matterの `hidden`
* ページタイトル
* ロケール

## 17.2 明示定義

```ts
navigation: {
  mode: "manual",

  locales: {
    "en-US": [
      {
        title: "Introduction",
        items: [
          {
            title: "Getting Started",
            href: "/getting-started",
          },
        ],
      },
    ],

    "ja-JP": [
      {
        title: "はじめに",
        items: [
          {
            title: "導入方法",
            href: "/getting-started",
          },
        ],
      },
    ],
  },
}
```

ローカルリンクの `href` にはロケールを含めない。

Makitが現在のロケールを付与する。

## 17.3 型

```ts
export interface NavigationGroup {
  title?: string;
  items: NavigationItem[];
}

export interface NavigationItem {
  title: string;
  href?: string;
  external?: boolean;
  items?: NavigationItem[];
}
```

## 17.4 フォールバックページ

自動ナビゲーションへフォールバックページを含めるか設定可能とする。

```ts
navigation: {
  mode: "auto",
  includeFallbackPages: true,
}
```

標準値は `true` とする。

---

# 18. ヘッダーとフッター

## 18.1 ヘッダー

```ts
header: {
  logo: "/logo.svg",
  title: "Makit",
  links: [
    {
      label: "Guide",
      href: "/getting-started",
    },
    {
      label: "GitHub",
      href: "https://github.com/example/makit",
      external: true,
    },
  ],
}
```

## 18.2 フッター

```ts
footer: {
  copyright: "© 2026 Makit contributors",
  links: [
    {
      label: "GitHub",
      href: "https://github.com/example/makit",
    },
  ],
}
```

ヘッダーおよびフッターの文字列は、将来的にロケール別設定を許可する。

---

# 19. Markdown処理

## 19.1 処理パイプライン

```text
Markdown source
    ↓
Front Matter extraction
    ↓
remark parse
    ↓
built-in remark plugins
    ↓
user remark plugins
    ↓
mdast validation
    ↓
remark-rehype
    ↓
built-in rehype plugins
    ↓
user rehype plugins
    ↓
Shiki highlighting
    ↓
HTML AST transformation
    ↓
HTML serialization
    ↓
Generated page data
```

## 19.2 標準対応

MVPでは以下を標準対応する。

* CommonMark
* GitHub Flavored Markdown
* 表
* タスクリスト
* 取り消し線
* 脚注
* 見出しID
* 見出しアンカー
* 外部リンク処理
* コードブロック
* インラインコード
* 画像
* 引用
* 水平線

## 19.3 設定

```ts
markdown: {
  gfm: true,
  headingIds: true,

  externalLinks: {
    target: "_blank",
    rel: "noopener noreferrer",
  },

  code: {
    copyButton: true,
    lineNumbers: false,
  },

  shiki: {
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
    unknownLanguage: "warning",
  },
}
```

## 19.4 remark / rehypeプラグイン

```ts
import remarkGfm from "remark-gfm";

export default defineConfig({
  markdown: {
    remarkPlugins: [
      remarkGfm,
    ],
  },
});
```

オプション付き:

```ts
remarkPlugins: [
  [plugin, {
    option: true,
  }],
]
```

内部プラグインとユーザープラグインの順序を明確に定義する。

ユーザープラグインがMakitの必須処理を破壊しないよう、一部の内部処理はユーザープラグイン実行後に再適用する。

## 19.5 生HTML

Markdown内の生HTMLは標準では無効とする。

理由:

* セキュリティ
* レイアウト破壊防止
* 静的解析の一貫性
* 移植性

設定で有効化可能とする場合は、明示的な危険設定として扱う。

```ts
markdown: {
  allowDangerousHtml: false,
}
```

---

# 20. Shiki

## 20.1 ハイライト方式

コードブロックはビルド時にShikiでハイライトする。

クライアント側での再ハイライトは行わない。

## 20.2 テーマ

単一テーマ:

```ts
shiki: {
  theme: "github-dark",
}
```

ライト・ダーク:

```ts
shiki: {
  themes: {
    light: "github-light",
    dark: "github-dark",
  },
}
```

## 20.3 言語

コードブロックから使用言語を収集し、必要な言語のみ読み込むことを推奨する。

明示指定も可能とする。

```ts
shiki: {
  languages: [
    "typescript",
    "javascript",
    "json",
    "bash",
  ],
}
```

## 20.4 不明な言語

```ts
unknownLanguage: "warning"
```

選択肢:

* `error`
* `warning`
* `plain-text`

標準値は `warning` とする。

## 20.5 コードブロックメタデータ

将来的に以下の記法を対応可能とする。

````md
```ts title="makit.config.ts" {2,4-6}
const value = true;
```
````

想定機能:

* ファイル名
* 行ハイライト
* 行番号
* 差分表示
* コードコピー
* フォーカス行

---

# 21. テーマとスタイル

## 21.1 標準テーマ

Makitは標準テーマを1つ提供する。

標準テーマは以下を含む。

* ヘッダー
* サイドバー
* モバイルナビゲーション
* 本文レイアウト
* ページ内目次
* 前後ページリンク
* 言語切り替え
* ライト・ダークモード
* コードブロック
* フォールバック通知
* 404ページ

## 21.2 Tailwind CSS

Tailwind CSSはMakit内部で管理する。

利用者にTailwind設定ファイルの作成を要求しない。

## 21.3 テーマ設定

```ts
theme: {
  colorScheme: "system",
  accentColor: "violet",
  radius: "medium",

  codeTheme: {
    light: "github-light",
    dark: "github-dark",
  },
}
```

型:

```ts
export interface ThemeConfig {
  colorScheme?: "light" | "dark" | "system";
  accentColor?: string;
  radius?: "none" | "small" | "medium" | "large";

  codeTheme?:
    | string
    | {
        light: string;
        dark: string;
      };
}
```

## 21.4 CSS Variables

テーマ値はCSS Variablesとして公開する。

例:

```css
:root {
  --makit-color-accent: ...;
  --makit-color-background: ...;
  --makit-color-foreground: ...;
  --makit-radius: ...;
}
```

## 21.5 カスタムCSS

```ts
styles: [
  "./styles/custom.css",
]
```

指定されたCSSは標準テーマの後に読み込む。

---

# 22. 静的アセット

プロジェクトの `publicDir` を `.makit/public/` へ同期する。

Markdownからはルート相対パスで参照する。

```md
![Logo](/logo.svg)
```

`basePath` がある場合、Makitランタイムが内部リンクおよびアセットURLへ適切に付加する。

存在しないローカル画像は警告またはエラーにできる。

---

# 23. ページデータ

生成ページは概念上以下のデータを持つ。

```ts
export interface GeneratedPage {
  pageId: string;

  route: string;
  segments: string[];

  locale: string;
  contentLocale: string;

  sourcePath: string;

  isFallback: boolean;
  fallbackSource?: string;

  title: string;
  description?: string;

  html: string;

  headings: GeneratedHeading[];

  draft: boolean;
  hidden: boolean;

  metadata: GeneratedMetadata;
}
```

見出し:

```ts
export interface GeneratedHeading {
  id: string;
  depth: number;
  text: string;
}
```

---

# 24. SEO

## 24.1 基本メタデータ

各ページへ以下を生成する。

* `<title>`
* description
* canonical URL
* robots
* Open Graph
* Twitter Card
* `lang`
* `dir`
* `hreflang`

## 24.2 タイトル形式

標準形式:

```text
{pageTitle} | {siteTitle}
```

設定可能とする。

```ts
seo: {
  titleTemplate: "%s | Makit",
}
```

## 24.3 OGP画像

優先順位:

1. ページFront Matterの `image`
2. ロケール別デフォルト画像
3. サイト全体のデフォルト画像
4. 画像なし

## 24.4 robots

Front Matter:

```yaml
noindex: true
nofollow: true
```

ドラフトページは本番出力しないため、robots設定の対象外となる。

## 24.5 `hreflang`

実在する翻訳ページのみをalternateとして出力する。

```html
<link
  rel="alternate"
  hreflang="en-US"
  href="https://example.com/en-us/getting-started/"
>
```

`x-default` はデフォルトロケールへ向ける。

---

# 25. サイトマップ

サイトマップを自動生成する。

設定:

```ts
sitemap: {
  enabled: true,
  includeFallbackPages: false,
}
```

標準では以下を除外する。

* ドラフト
* `noindex`
* フォールバックページ
* 明示的に除外されたページ

多言語ページはalternate URLとして関連付ける。

---

# 26. ページ内目次

見出しからページ内目次を生成する。

標準対象:

* H2
* H3

設定例:

```ts
markdown: {
  tableOfContents: {
    minDepth: 2,
    maxDepth: 3,
  },
}
```

Front Matterでページ単位に無効化できる。

```yaml
tableOfContents: false
```

見出しIDが重複する場合は連番を付加する。

```text
configuration
configuration-1
configuration-2
```

---

# 27. 内部リンク

## 27.1 Markdownリンク

Markdownファイルへのリンクをサイト内URLへ変換する。

```md
[Configuration](./guides/configuration.md)
```

変換:

```text
/guides/configuration/
```

## 27.2 ロケール

ロケール内の相対リンクは、同じロケールのページへ解決する。

翻訳先が存在しない場合はフォールバック設定に従う。

## 27.3 リンク検証

以下を検証する。

* 存在しないページ
* 存在しないアンカー
* 存在しない画像
* ドラフトページへの本番リンク
* 無効な外部URL形式
* ロケールを跨ぐ不正な相対リンク

外部URLのHTTP疎通確認は標準では行わない。

---

# 28. 検索

組み込み全文検索はMVPの必須範囲外とする。

ただし、将来的な検索実装に備え、検索用データを生成可能な内部構造とする。

```text
.makit/generated/search/
├── en-us.json
└── ja-jp.json
```

検索索引には以下を含める。

* ページタイトル
* 見出し
* 本文プレーンテキスト
* URL
* ロケール
* ページID

---

# 29. キャッシュ

## 29.1 目的

* 開発サーバー起動高速化
* Markdown再変換の削減
* Shiki処理の削減
* 大規模ドキュメントのビルド高速化

## 29.2 キャッシュキー

以下を含む。

* ソース本文のハッシュ
* Front Matter
* Makitバージョン
* 設定ファイルのハッシュ
* Markdownプラグイン設定
* Shiki設定
* テーマ設定
* ロケール設定
* レンダリングランタイムのバージョン

## 29.3 無効化

設定ファイル変更時は、影響範囲が特定できない場合に全キャッシュを無効化する。

`makit clean --cache-only` で削除可能とする。

---

# 30. ファイル監視

`makit dev` では以下を監視する。

* Markdownソース
* `makit.config.*`
* `publicDir`
* カスタムCSS
* 設定から参照されるローカルファイル

変更時の想定処理:

| 変更対象         | 処理                   |
| ------------ | -------------------- |
| Markdown本文   | 対象ページ再生成             |
| Front Matter | 対象ページ、ルート、ナビゲーション再生成 |
| 設定ファイル       | 全体再生成                |
| CSS          | スタイル再読み込み            |
| public       | アセット再同期              |
| ページ追加・削除     | ルート、ナビゲーション、リンク再生成   |

---

# 31. エラーハンドリング

## 31.1 エラー

以下はビルドを停止する。

* 設定ファイルを読み込めない
* 設定値が不正
* `defaultLocale` が存在しない
* ロケール正規化後の重複
* 同一ロケール内の重複ルート
* 同一ロケール内の重複ページID
* Front Matterの解析失敗
* Markdown処理失敗
* 必須ナビゲーション先の不存在
* Next.jsビルド失敗
* 出力先への書き込み失敗

例:

```text
Error: Duplicate route "/guides/"

  docs/en-us/guides.md
  docs/en-us/guides/index.md
```

## 31.2 警告

以下は標準では警告とする。

* ページタイトルがない
* 翻訳が存在しない
* 不明なShiki言語
* ナビゲーションに含まれないページ
* 存在しない内部リンク
* 存在しないアンカー
* サイトURLが設定されていない
* OGP画像が存在しない
* デフォルトロケールにのみ存在するページ
* 翻訳ロケールにのみ存在するページ
* フォールバックページが多い

## 31.3 Strict Mode

```ts
validation: {
  strict: true,
}
```

Strict Modeでは指定された警告をエラーへ昇格する。

```ts
validation: {
  failOn: [
    "broken-link",
    "missing-title",
    "missing-translation",
  ],
}
```

---

# 32. ログ

通常出力例:

```text
Makit v0.1.0

✓ Loaded makit.config.ts
✓ Found 2 locales

  en-US   42 pages
  ja-JP   35 pages
          7 fallback pages

✓ Validated internal links
✓ Generated 84 static routes
✓ Built static site

Output: dist/
```

詳細ログでは以下を表示する。

* 対象ファイル
* キャッシュヒット
* ページ生成時間
* Shiki処理時間
* Next.jsビルド出力
* ルート一覧
* 警告詳細

JSONログはCI統合向けに提供する。

---

# 33. Next.jsアプリケーション生成

## 33.1 責務

生成されるNext.jsアプリケーションは以下に専念する。

* 生成済みページデータの読込
* ページレイアウト
* メタデータ生成
* 静的ルート列挙
* UIコンポーネントの描画
* Static Export

Markdownの探索や解析は原則として行わない。

## 33.2 ルート構成

```text
app/
├── layout.tsx
├── page.tsx
├── not-found.tsx
└── [locale]/
    ├── layout.tsx
    └── [[...slug]]/
        └── page.tsx
```

## 33.3 静的パラメータ

Makitが生成したページマニフェストから、すべてのロケールとslugを列挙する。

概念例:

```ts
export function generateStaticParams() {
  return pages.map((page) => ({
    locale: page.locale.toLowerCase(),
    slug: page.segments,
  }));
}
```

## 33.4 Next.js設定

内部生成される設定の概念:

```ts
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};
```

利用者には任意のNext.js設定マージを初期実装では許可しない。

---

# 34. パッケージ構成

初期段階では以下のモノレポ構成を推奨する。

```text
packages/
├── makit/
├── cli/
├── core/
├── markdown/
├── runtime/
└── theme-default/
```

## 34.1 `makit`

利用者向け統合パッケージ。

提供物:

* `defineConfig`
* 公開型
* CLIへの依存
* 標準設定

## 34.2 `cli`

* コマンド解析
* ログ
* 終了コード
* プロセス管理
* 開発サーバー管理

## 34.3 `core`

* 設定読込
* ファイル収集
* ページモデル
* ルート生成
* 国際化
* ナビゲーション
* キャッシュ
* 検証
* ビルド制御

## 34.4 `markdown`

* remark
* rehype
* Front Matter
* Shiki
* 見出し
* リンク変換
* HTML生成

## 34.5 `runtime`

* Next.jsページ
* Reactコンポーネント
* メタデータ生成
* 言語切り替え
* テーマ切り替え

## 34.6 `theme-default`

* Tailwind CSS
* CSS Variables
* 標準レイアウト
* 標準UI

実装初期は以下の3パッケージまで統合してもよい。

```text
packages/
├── makit
├── makit-cli
└── makit-runtime
```

---

# 35. 設定例

```ts
import { defineConfig } from "makit";
import remarkGfm from "remark-gfm";

export default defineConfig({
  title: "Makit Documentation",
  description: "Markdown to documentation.",

  siteUrl: "https://makit.example.com",

  sourceDir: "docs",
  publicDir: "public",
  outDir: "dist",

  i18n: {
    defaultLocale: "en-US",

    locales: [
      {
        locale: "en-US",
        label: "English",
      },
      {
        locale: "ja-JP",
        label: "日本語",
      },
    ],

    fallback: {
      enabled: true,
      behavior: "render",
      showNotice: true,
    },

    root: {
      behavior: "detect",
    },

    localeSwitcher: {
      missingPage: "fallback",
    },

    messages: {
      "ja-JP": {
        fallbackNotice:
          "このページは日本語に翻訳されていないため、英語版を表示しています。",
      },
    },
  },

  navigation: {
    mode: "auto",
    includeFallbackPages: true,
  },

  header: {
    logo: "/logo.svg",

    links: [
      {
        label: "GitHub",
        href: "https://github.com/example/makit",
        external: true,
      },
    ],
  },

  theme: {
    colorScheme: "system",
    accentColor: "violet",
    radius: "medium",

    codeTheme: {
      light: "github-light",
      dark: "github-dark",
    },
  },

  markdown: {
    gfm: true,
    headingIds: true,

    remarkPlugins: [
      remarkGfm,
    ],

    externalLinks: {
      target: "_blank",
      rel: "noopener noreferrer",
    },

    tableOfContents: {
      minDepth: 2,
      maxDepth: 3,
    },

    code: {
      copyButton: true,
      lineNumbers: false,
    },

    shiki: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },

      unknownLanguage: "warning",
    },
  },

  styles: [
    "./styles/custom.css",
  ],

  seo: {
    titleTemplate: "%s | Makit",
    defaultImage: "/og-default.png",
  },

  sitemap: {
    enabled: true,
    includeFallbackPages: false,
  },

  build: {
    clean: true,
    trailingSlash: true,
  },

  dev: {
    port: 3000,
    host: "localhost",
    open: true,
  },

  validation: {
    strict: false,

    failOn: [
      "duplicate-route",
      "duplicate-page-id",
    ],
  },
});
```

---

# 36. MVP対象範囲

MVPでは以下を実装する。

## CLI

* `makit init`
* `makit dev`
* `makit build`
* `makit preview`
* `makit clean`
* `makit check`

## コンテンツ

* Markdown
* YAML Front Matter
* GFM
* remark / rehype
* Shiki
* 見出しアンカー
* ページ内目次
* コードコピー
* コードテーマ
* 静的画像

## サイト

* Next.js App Router
* Static Export
* 標準テーマ
* サイドバー
* ヘッダー
* フッター
* モバイル表示
* ライト・ダークモード
* 前後ページリンク
* 404ページ

## 国際化

* ロケール接頭辞URL
* デフォルトロケール
* ロケール別ディレクトリ
* ロケール別任意ソースディレクトリ
* ページIDによる翻訳対応
* 翻訳欠損フォールバック
* フォールバック通知
* 言語切り替え
* ブラウザ言語検出
* `lang`
* `dir`
* `hreflang`
* canonical
* ロケール別ナビゲーション
* ロケール別サイトマップ

## 品質

* 設定検証
* 重複ルート検出
* 重複ページID検出
* 内部リンク検証
* 不明なコード言語の検出
* キャッシュ
* ファイル監視
* CI向け終了コード

---

# 37. MVP対象外

以下は初期実装から除外する。

* MDX
* ユーザー定義Reactコンポーネント
* 複数テーマパッケージ
* ドキュメントのバージョニング
* サーバーサイド機能
* 認証
* CMS連携
* 外部検索サービス
* 組み込み全文検索UI
* PDF出力
* RSS
* OpenAPI自動生成
* TypeDoc自動生成
* Mermaid
* 数式レンダリング
* ドメイン別ロケール
* 複数段階フォールバック
* 機械翻訳
* Next.js設定の自由な上書き
* ホスティングサービス固有のリダイレクト生成
* プラグインマーケットプレイス

---

# 38. 将来拡張

将来的に以下を検討する。

* MDX
* カスタムコンポーネント
* Mermaid
* KaTeX / MathJax
* OpenAPIページ生成
* TypeDoc連携
* Rustdoc連携
* ローカル全文検索
* Algolia連携
* ドキュメントバージョニング
* 翻訳進捗レポート
* 翻訳差分検出
* 翻訳更新期限の警告
* 多段フォールバック
* 複数テーマ
* テーマパッケージ
* プラグインAPI
* RSS
* PDF出力
* GitHub Pages設定生成
* Cloudflare Pages設定生成
* Netlifyリダイレクト生成
* Vercel設定生成
* 編集リンク
* Git履歴を利用した最終更新日時
* コントリビューター表示

---

# 39. 受け入れ基準

MVPは、以下を満たした場合に完成とみなす。

1. `makit init` で実行可能なプロジェクトを生成できる
2. `makit dev` でMarkdownの変更をプレビューできる
3. `makit build` で静的サイトを生成できる
4. `dist/` のみを静的サーバーへ配置して閲覧できる
5. `/en-us/` と `/ja-jp/` のようなロケールURLを生成できる
6. 翻訳がないページでデフォルトロケールへフォールバックできる
7. フォールバックページで元言語を判別できる
8. 言語切り替えが同一ページ間で機能する
9. ファイル名が異なる翻訳をページIDで対応付けられる
10. remarkプラグインを設定から追加できる
11. Shikiでコードをビルド時にハイライトできる
12. ライト・ダークテーマを切り替えられる
13. 自動ナビゲーションを生成できる
14. 重複ルートをビルド時に検出できる
15. 壊れた内部リンクを検出できる
16. canonicalおよび`hreflang`を生成できる
17. フォールバックページをサイトマップから除外できる
18. `.makit/` を削除しても再生成できる
19. 利用者がNext.jsファイルを直接編集せずに運用できる
20. CI環境で非対話的にビルドおよび検証できる

---

# 40. 実装上の決定事項

## 40.1 `.makit/` の位置付け

`.makit/` は利用者のアプリケーションを配置する場所ではなく、Makitが生成する再現可能なNext.jsアプリケーションである。

## 40.2 Markdown処理の位置

Markdown処理はNext.jsページコンポーネント内ではなく、Makit Coreで事前実行する。

Next.jsランタイムは生成済みデータの表示へ専念する。

## 40.3 国際化フォールバック

フォールバックはリクエスト時ではなく、ビルド時に静的ページとして生成する。

## 40.4 ページの同一性

URLやファイル名ではなく、Front Matterの `id` をページの安定した識別子として使用できる。

## 40.5 Next.js依存

Next.js固有の設定はMakit内部へ閉じ込める。

利用者へ公開する設定は、Makitが長期的に互換性を保証できる範囲に限定する。

## 40.6 出力の可搬性

生成された `dist/` は、Node.jsランタイムやMakit本体を必要とせず配信できなければならない。
