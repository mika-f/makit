# Makit 階層型ドキュメント仕様

## 1. 文書情報

* プロダクト名: Makit
* 種別: Markdown to Static Documentation Generator
* 形式: Node.js CLI アプリケーション
* 仕様バージョン: 0.2
* 設定ファイル: `makit.config.ts`
* CLI コマンド: `makit`

---

# 2. 概要

Makit は、Markdown ファイルから静的なドキュメントサイトを生成する OSS の CLI アプリケーションである。

単一製品のドキュメントサイトだけでなく、Microsoft Learn や GitHub Docs のような、複数の製品、サービス、技術領域を横断する階層型ドキュメントポータルを構築できる。

利用者は主に以下を管理する。

* Markdown 本文
* TypeScript メタデータ
* `makit.config.ts`
* 静的アセット
* カスタム CSS

Makit は `.makit/` に内部用 Next.js アプリケーションを生成し、開発サーバーと静的ビルドを提供する。

主な技術構成:

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

Makit は以下を目的とする。

1. Markdown から静的ドキュメントサイトを生成する
2. Next.js 固有の構成を利用者から隠蔽する
3. 複数製品を横断する階層型サイトを構築できる
4. サイト構造とメタデータを TypeScript で型安全に定義できる
5. 多言語サイトと翻訳欠損時のフォールバックを提供する
6. URL 階層とナビゲーション階層を独立して管理できる
7. 静的ホスティングサービスごとの差異を Adapter で吸収する
8. 設定やコンテンツの不整合をビルド時に検出する
9. 小規模サイトから大規模ポータルへ段階的に拡張できる

---

# 4. 非目標

初期バージョンでは以下を目的としない。

* 動的な Web アプリケーション
* サーバーサイド認証
* データベース接続
* CMS 管理画面
* ブラウザ上での Markdown 編集
* 実行時のページ生成
* ホスティングサービスの提供
* ユーザーによる任意の Next.js アプリケーション拡張
* サーバーレス Function の自動生成
* 学習進捗やクイズ機能

---

# 5. 設計原則

## 5.1 TypeScript 中心

サイト構造、Collection、ナビゲーション、カテゴリ、ページ情報などのメタデータは TypeScript で定義する。

YAML 形式の構造メタデータは採用しない。

非対応ファイル:

```text
_collection.yml
_navigation.yml
_category.yml
```

TypeScript により以下を提供する。

* エディター補完
* 型検査
* JSDoc
* 列挙値の発見
* 共通設定の再利用
* リファクタリング
* 非推奨設定の検出

## 5.2 Markdown は本文を担当する

Markdown は原則として本文の記述に専念する。

ページタイトル、ID、slug、分類情報などは同名の `.meta.ts` で定義できる。

メタデータが不要な単純なページは Markdown 単体でも作成できる。

## 5.3 Next.js の隠蔽

利用者に以下を要求しない。

* `app/` ディレクトリ
* `next.config.ts`
* `generateStaticParams`
* Next.js のルーティング
* Next.js 用 Tailwind 設定
* Static Export の構成

## 5.4 静的出力

成果物は Node.js ランタイムを必要としない静的ファイルとして生成する。

## 5.5 再生成可能性

`.makit/` は Makit が再生成可能な中間ディレクトリとする。

手動編集は保証しない。

## 5.6 URL と情報構造の分離

ナビゲーション上の階層と URL 階層は独立して定義できる。

## 5.7 明示的な Adapter

Deployment Adapter はファクトリー関数を明示的に import して設定する。

環境による Adapter の自動選択は行わない。

---

# 6. コンテンツモデル

Makit は以下の概念を扱う。

```text
Site
├── Global Navigation
├── Home
└── Collection
    ├── Section
    │   ├── Group
    │   │   └── Page
    │   └── Page
    └── Page
```

すべての階層は必須ではない。

以下も有効とする。

```text
Site
└── Page
```

```text
Site
└── Collection
    └── Page
```

```text
Site
└── Collection
    └── Section
        └── Page
```

---

# 7. 用語

## 7.1 Site

Makit が生成するドキュメントサイト全体。

## 7.2 Collection

製品、サービス、ライブラリ、API、技術領域など、まとまりのあるドキュメント群。

例:

* Makit
* Enduroq
* Catalyst
* GitHub Actions
* REST API

Collection は独自の URL、ナビゲーション、トップページ、説明を持てる。

## 7.3 Section

Collection 内の大分類。

例:

* Getting Started
* Guides
* Concepts
* Reference
* Troubleshooting

ページを持つ場合と、ナビゲーション上だけに存在する場合がある。

## 7.4 Group

Section 内の小分類。

原則としてナビゲーション整理用の論理ノードである。

## 7.5 Page

Markdown から生成されるコンテンツページ。

## 7.6 Navigation Node

Page、Section、Group、Collection、外部リンクを統一的に扱うナビゲーション要素。

---

# 8. 標準ディレクトリ構成

```text
my-documentation/
├── docs/
│   ├── en-us/
│   │   ├── makit/
│   │   │   ├── collection.makit.ts
│   │   │   ├── navigation.makit.ts
│   │   │   ├── index.md
│   │   │   ├── index.meta.ts
│   │   │   ├── getting-started/
│   │   │   │   ├── category.makit.ts
│   │   │   │   ├── installation.md
│   │   │   │   ├── installation.meta.ts
│   │   │   │   ├── configuration.md
│   │   │   │   └── configuration.meta.ts
│   │   │   └── deployment/
│   │   │       ├── category.makit.ts
│   │   │       ├── github-pages.md
│   │   │       └── github-pages.meta.ts
│   │   └── enduroq/
│   │       ├── collection.makit.ts
│   │       └── index.md
│   └── ja-jp/
│       ├── makit/
│       └── enduroq/
├── public/
├── styles/
│   └── custom.css
├── makit.config.ts
├── package.json
└── .gitignore
```

生成後:

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
└── ...
```

---

# 9. メタデータファイル

## 9.1 命名規則

| 用途                    | ファイル名                 |
| --------------------- | --------------------- |
| サイト全体                 | `makit.config.ts`     |
| Collection            | `collection.makit.ts` |
| Collection Navigation | `navigation.makit.ts` |
| Section / Group       | `category.makit.ts`   |
| Page                  | `{filename}.meta.ts`  |

例:

```text
github-pages.md
github-pages.meta.ts
```

`.makit.ts` は Makit が探索する構造メタデータを示す。

`.meta.ts` は対応する Markdown ページのメタデータを示す。

---

# 10. 公開メタデータ API

Makit は専用エントリーポイントから定義関数と型を公開する。

```ts
import {
  defineCollection,
  defineNavigation,
  defineCategory,
  definePageMetadata,

  type CollectionMetadata,
  type NavigationMetadata,
  type NavigationNode,
  type CategoryMetadata,
  type PageMetadata,
} from "makit/metadata";
```

サイト全体の設定:

```ts
import { defineConfig } from "makit";
```

Deployment Adapter 用の型:

```ts
import type {
  DeploymentAdapter,
  DeploymentAdapterContext,
} from "makit/adapter";
```

---

# 11. Collection メタデータ

## 11.1 定義例

```ts
import { defineCollection } from "makit/metadata";

export default defineCollection({
  id: "makit",
  title: "Makit",
  description:
    "Markdownから静的ドキュメントを生成するツール",
  path: "/makit",
  icon: "/icons/makit.svg",
  index: "index.md",
});
```

## 11.2 型

```ts
export interface CollectionMetadata {
  /**
   * サイト内で一意なCollection識別子。
   */
  id: string;

  /**
   * Collectionの表示名。
   */
  title:
    | string
    | LocalizedValue<string>;

  /**
   * Collectionの説明。
   */
  description?:
    | string
    | LocalizedValue<string>;

  /**
   * ロケール接頭辞を除くURLプレフィックス。
   */
  path?: string;

  /**
   * Collectionトップページ。
   *
   * @default "index.md"
   */
  index?: string;

  icon?: string;

  hidden?: boolean;

  seo?: CollectionSeoConfig;
}
```

## 11.3 定義関数

```ts
export function defineCollection(
  metadata: CollectionMetadata,
): CollectionMetadata;
```

---

# 12. Collection の検出

`makit.config.ts` で探索方式を指定できる。

```ts
export default defineConfig({
  collections: {
    mode: "discover",
  },
});
```

Makit は各ロケールのソースディレクトリ配下から `collection.makit.ts` を探索する。

```text
docs/en-us/makit/collection.makit.ts
docs/en-us/enduroq/collection.makit.ts
docs/ja-jp/makit/collection.makit.ts
```

異なるロケールで同じ `id` を持つ Collection は、同一 Collection の翻訳として扱う。

---

# 13. Collection の明示定義

通常の TypeScript モジュールとして import することもできる。

```ts
import { defineConfig } from "makit";

import makitCollection from
  "./metadata/collections/makit";
import enduroqCollection from
  "./metadata/collections/enduroq";

export default defineConfig({
  collections: [
    makitCollection,
    enduroqCollection,
  ],
});
```

`collections` 配列を指定した場合、自動探索は行わない。

混在モードは MVP では提供しない。

---

# 14. Navigation メタデータ

## 14.1 定義例

```ts
import { defineNavigation } from "makit/metadata";

export default defineNavigation({
  items: [
    {
      type: "page",
      page: "makit-overview",
    },
    {
      type: "section",
      id: "getting-started",
      title: "Getting Started",
      items: [
        {
          type: "page",
          page: "installation",
        },
        {
          type: "page",
          page: "configuration",
        },
      ],
    },
    {
      type: "section",
      id: "deployment",
      title: "Deployment",
      collapsible: true,
      collapsed: false,
      items: [
        {
          type: "page",
          page: "deployment-cloudflare",
        },
        {
          type: "page",
          page: "deployment-github",
        },
      ],
    },
  ],
});
```

## 14.2 型

```ts
export interface NavigationMetadata {
  items: NavigationNode[];
}
```

```ts
export type NavigationNode =
  | NavigationPageNode
  | NavigationSectionNode
  | NavigationGroupNode
  | NavigationLinkNode
  | NavigationCollectionNode;
```

### Page Node

```ts
export interface NavigationPageNode {
  type: "page";

  /**
   * 対象ページのpageId。
   */
  page: string;

  title?: string;
  hidden?: boolean;
}
```

### Section Node

```ts
export interface NavigationSectionNode {
  type: "section";

  id?: string;
  title: string;

  /**
   * Section自体をクリック可能にするページID。
   */
  page?: string;

  items: NavigationNode[];

  collapsible?: boolean;
  collapsed?: boolean;
}
```

### Group Node

```ts
export interface NavigationGroupNode {
  type: "group";

  id?: string;
  title?: string;

  items: NavigationNode[];

  collapsible?: boolean;
  collapsed?: boolean;
}
```

### Link Node

```ts
export interface NavigationLinkNode {
  type: "link";

  title: string;
  href: string;

  external?: boolean;
}
```

### Collection Node

```ts
export interface NavigationCollectionNode {
  type: "collection";

  collection: string;
  title?: string;
}
```

---

# 15. Category メタデータ

## 15.1 定義例

```ts
import { defineCategory } from "makit/metadata";

export default defineCategory({
  id: "deployment",
  title: "Deployment",
  type: "section",
  order: 30,
  collapsible: true,
  collapsed: false,
  index: "index.md",
});
```

## 15.2 型

```ts
export interface CategoryMetadata {
  id?: string;

  title?:
    | string
    | LocalizedValue<string>;

  /**
   * @default "section"
   */
  type?: "section" | "group";

  order?: number;

  hidden?: boolean;

  collapsible?: boolean;
  collapsed?: boolean;

  index?: string;
}
```

## 15.3 自動ナビゲーションでの利用

`navigation.makit.ts` が存在せず、Collection の Navigation が `auto` の場合、ディレクトリ内の `category.makit.ts` を利用して階層を生成する。

解決に使用する情報:

* `type`
* `title`
* `order`
* `hidden`
* `collapsible`
* `collapsed`
* `index`

---

# 16. Page メタデータ

## 16.1 定義例

```ts
import {
  definePageMetadata,
} from "makit/metadata";

export default definePageMetadata({
  id: "deployment-github-pages",
  title: "GitHub Pages",
  description:
    "Deploy Makit documentation to GitHub Pages.",

  slug: [
    "deployment",
    "github-pages",
  ],

  order: 20,

  sidebar: true,
  tableOfContents: true,

  taxonomy: {
    topics: [
      "deployment",
      "static-hosting",
    ],
    audiences: [
      "developers",
      "maintainers",
    ],
  },
});
```

対応する Markdown:

```md
# GitHub Pages

本文……
```

## 16.2 型

```ts
export interface PageMetadata {
  /**
   * 翻訳間で共通する安定したページ識別子。
   */
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

    /**
     * 同一ページが複数配置される場合の正規位置。
     */
    primary?: string[];
  };

  taxonomy?: PageTaxonomy;
}
```

```ts
export interface PageTaxonomy {
  topics?: string[];
  products?: string[];
  audiences?: string[];
  tags?: string[];
}
```

## 16.3 定義関数

```ts
export function definePageMetadata(
  metadata: PageMetadata,
): PageMetadata;
```

---

# 17. Page メタデータの解決

ページメタデータは以下の順で解決する。

1. `{filename}.meta.ts`
2. Markdown 自身の YAML Front Matter(フラットな1階層のみ)
3. Markdown の最初の H1
4. ファイル名
5. 自動生成値

`{filename}.meta.ts` は構造化メタデータの主手段だが、`order` や `title` など数個のスカラー値だけを上書きしたい単純なページのために、Markdown 自身の Front Matter を軽量な代替手段として許容する。

Front Matter で指定できるのは `PageMetadata` のうちスカラー値のフィールド(`id`, `title`, `description`, `slug`, `order`, `draft`, `hidden`, `sidebar`, `tableOfContents`, `layout`, `canonical`, `image`, `noindex`, `nofollow`)に限る。`navigation` や `taxonomy` などネストしたフィールドはビルドエラーとし、`{filename}.meta.ts` の使用を促す。

1つのページで `{filename}.meta.ts` と Front Matter を同時に定義することはできない(どちらか一方)。両方存在する場合はビルドエラーとする。

Front Matter を完全に禁止し、メタデータを `{filename}.meta.ts` のみに限定したい場合:

```ts
validation: {
  disallowFrontMatter: true,
}
```

標準値は `false`(フラットな Front Matter を許容)とする。

---

# 18. Markdown 単体ページ

`.meta.ts` は必須ではない。

```text
getting-started.md
```

```md
# Getting Started

本文……
```

この場合:

* `id`: 相対ファイルパスから生成
* `title`: 最初の H1
* `slug`: 相対ファイルパス
* `order`: 未指定
* `draft`: `false`
* `hidden`: `false`

生成される ID の例:

```text
guides/getting-started.md
→ guides.getting-started
```

明示的な ID を推奨するが、小規模サイトでは自動 ID を利用できる。

---

# 19. TypeScript メタデータの共通化

メタデータからローカル TypeScript モジュールを import できる。

```ts
import {
  commonDeploymentItems,
} from "../../../metadata/navigation";

export default defineNavigation({
  items: commonDeploymentItems,
});
```

共通オプション:

```ts
import {
  defineCategory,
  type CategoryMetadata,
} from "makit/metadata";

const defaults = {
  type: "section",
  collapsible: true,
  collapsed: true,
} satisfies Partial<CategoryMetadata>;

export default defineCategory({
  ...defaults,
  id: "deployment",
  title: "Deployment",
});
```

ローカル import の依存ファイルも監視対象に含める。

---

# 20. メタデータの実行制約

メタデータファイルは Node.js 環境で実行する。

以下を要件とする。

* default export が存在する
* 対応する `define*` 関数の戻り値を export する
* 同期的に評価できる
* Promise を返さない
* シリアライズ可能なデータである
* 循環参照を含まない
* React 要素を含まない
* DOM API に依存しない

非対応例:

```ts
export default async function loadMetadata() {
  const response = await fetch("https://example.com");

  return defineCollection({
    id: "makit",
    title: await response.text(),
  });
}
```

MVP では非同期メタデータを許可しない。

---

# 21. 環境変数

メタデータから `process.env` を参照することは技術的には可能だが、ビルド再現性を損なうため非推奨とする。

環境変数を参照した場合、`makit check` は警告できる。

```text
Warning: collection.makit.ts depends on process.env.PRODUCT_NAME.
Metadata output may differ between environments.
```

Deployment Adapter の認証情報や CI 固有情報は例外として、Adapter 内部で扱う。

---

# 22. TypeScript ローダー

Makit は TypeScript 設定およびメタデータを内部ローダーで読み込む。

実装候補:

* `jiti`
* `tsx`
* esbuild
* rolldown
* Node.js の型除去機能

ローダーは内部実装とし、利用者に追加設定を要求しない。

キャッシュキーには以下を含める。

* メタデータファイル内容
* ローカル import の内容
* Makit バージョン
* ローダーバージョン
* Node.js バージョン
* 関連する設定値

---

# 23. サイト全体の設定

```ts
import { defineConfig } from "makit";
import cloudflarePages from
  "@makit/adapter-cloudflare-pages";

export default defineConfig({
  title: "Natsuneko Documentation",
  description:
    "Documentation for Natsuneko products and services",

  siteUrl: "https://docs.natsuneko.com",

  sourceDir: "docs",
  publicDir: "public",
  outDir: "dist",

  collections: {
    mode: "discover",
  },

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

    collectionFallback: {
      behavior: "render",
    },

    root: {
      behavior: "detect",
    },
  },

  home: {
    layout: "portal",

    featuredCollections: [
      "makit",
      "enduroq",
      "catalyst",
    ],
  },

  deployment: {
    adapter: cloudflarePages(),
  },
});
```

---

# 24. `MakitConfig` 型

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

  collections?:
    | CollectionMetadata[]
    | {
        mode: "discover";
      };

  home?: HomeConfig;

  i18n?: MakitI18nConfig;

  navigation?: SiteNavigationConfig;

  header?: HeaderConfig;
  footer?: FooterConfig;

  theme?: ThemeConfig;

  markdown?: MarkdownConfig;
  styles?: string[];

  seo?: SeoConfig;
  sitemap?: SitemapConfig;

  redirects?: RedirectConfig[];
  headers?: HeaderRuleConfig[];

  deployment?: DeploymentConfig;

  build?: BuildConfig;
  dev?: DevConfig;
  preview?: PreviewConfig;

  validation?: ValidationConfig;
  experimental?: ExperimentalConfig;
}
```

---

# 25. Collection Navigation

Collection ごとに以下から選択できる。

```ts
export type CollectionNavigationConfig =
  | {
      mode: "auto";
      includeFallbackPages?: boolean;
    }
  | {
      mode: "manual";
      items: NavigationNode[];
    };
```

`navigation.makit.ts` が存在する場合は manual navigation として扱う。

優先順位:

1. `makit.config.ts` から import された明示設定
2. `navigation.makit.ts`
3. 自動生成

複数方式が競合した場合はエラーとする。

---

# 26. Global Navigation

サイト全体の主要領域を定義する。

```ts
navigation: {
  global: [
    {
      title: "Products",
      items: [
        {
          title: "Makit",
          collection: "makit",
        },
        {
          title: "Enduroq",
          collection: "enduroq",
        },
      ],
    },
    {
      title: "Resources",
      items: [
        {
          title: "GitHub",
          href: "https://github.com/example",
          external: true,
        },
      ],
    },
  ],
}
```

型:

```ts
export interface GlobalNavigationGroup {
  title?: string;
  items: GlobalNavigationItem[];
}

export interface GlobalNavigationItem {
  title: string;

  href?: string;
  collection?: string;

  external?: boolean;

  items?: GlobalNavigationItem[];
}
```

`href` と `collection` は同時指定できない。

---

# 27. 自動ナビゲーション

自動生成では以下を使用する。

* ディレクトリ階層
* `category.makit.ts`
* Page Metadata
* Collection Metadata
* `index.md`
* `order`
* `hidden`
* ページタイトル

並び順:

1. `order` の昇順
2. タイトルのロケール順
3. ファイル名

`order` が同一の場合は安定した並びを保証する。

---

# 28. URL ルーティング

## 28.1 Collection URL

Collection の `path` を URL プレフィックスとして使用する。

```ts
defineCollection({
  id: "makit",
  title: "Makit",
  path: "/makit",
});
```

生成例:

```text
/makit/
/makit/getting-started/
/makit/deployment/github-pages/
```

国際化使用時:

```text
/en-us/makit/
/ja-jp/makit/
/en-us/makit/deployment/github-pages/
```

## 28.2 slug

Page Metadata で URL を明示できる。

```ts
export default definePageMetadata({
  id: "deployment-github-pages",
  title: "GitHub Pages",
  slug: [
    "deploy",
    "github",
  ],
});
```

生成 URL:

```text
/en-us/makit/deploy/github/
```

## 28.3 URL と Navigation の分離

ナビゲーション:

```text
Makit
└── Guides
    └── Deployment
        └── GitHub Pages
```

URL:

```text
/en-us/makit/deploy/github/
```

両者は一致する必要がない。

---

# 29. ページ ID

Page ID は翻訳、ナビゲーション参照、関連ページ、言語切り替えに使用する安定した識別子である。

英語:

```ts
definePageMetadata({
  id: "deployment-github-pages",
  title: "GitHub Pages",
});
```

日本語:

```ts
definePageMetadata({
  id: "deployment-github-pages",
  title: "GitHub Pages へのデプロイ",
});
```

同じ ID を持つページは同一ページの翻訳として扱う。

同一ロケールかつ同一 Collection 内での重複はエラーとする。

---

# 30. 同一ページの複数配置

同じ Page ID をナビゲーション内で複数回参照できる。

```text
Makit
├── Getting Started
│   └── Configuration
└── Reference
    └── Configuration
```

ページの実体と canonical URL は1つとする。

正規ナビゲーション位置:

```ts
definePageMetadata({
  id: "configuration",

  navigation: {
    primary: [
      "getting-started",
      "configuration",
    ],
  },
});
```

未指定の場合、最初に出現した位置を正規位置とする。

複数配置されている場合は警告を出せる。

---

# 31. パンくずリスト

解決順:

1. Site
2. Collection
3. Section
4. Group
5. Page

例:

```text
Home
> Makit
> Deployment
> Hosting Providers
> GitHub Pages
```

URL を持たない Section や Group はリンクなしラベルとして表示する。

---

# 32. 前後ページ

前後ページはファイル順ではなく、解決済み Navigation の順序から決定する。

```ts
navigation: {
  pagination: {
    enabled: true,
    crossSection: true,
  },
}
```

`crossSection: false` の場合は同一 Section 内に限定する。

ページが複数位置に存在する場合は正規ナビゲーション位置を使用する。

---

# 33. サイトトップ

## 33.1 Page Layout

Markdown ページをトップとして使用する。

```ts
home: {
  layout: "page",
  page: "site-home",
}
```

## 33.2 Portal Layout

複数 Collection への入口を表示する。

```ts
home: {
  layout: "portal",

  featuredCollections: [
    "makit",
    "enduroq",
  ],

  sections: [
    {
      title: {
        "en-US": "Developer Tools",
        "ja-JP": "開発者向けツール",
      },

      collections: [
        "makit",
        "enduroq",
      ],
    },
  ],
}
```

型:

```ts
export interface HomeConfig {
  layout?: "page" | "portal";

  page?: string;

  featuredCollections?: string[];

  sections?: HomeSectionConfig[];
}
```

---

# 34. Collection トップ

標準では Collection ディレクトリの `index.md` を使用する。

```text
docs/en-us/makit/index.md
docs/en-us/makit/index.meta.ts
```

Collection Metadata の `index` で変更できる。

トップページが存在しない場合、Makit は以下から自動ページを生成できる。

* Collection タイトル
* 説明
* 主要 Section
* 注目ページ
* ページ数
* 関連 Collection

---

# 35. 国際化

## 35.1 URL

```text
/ja-jp/
/ja-jp/makit/
/ja-jp/makit/getting-started/

/en-us/
/en-us/makit/
/en-us/makit/getting-started/
```

## 35.2 設定

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

  collectionFallback: {
    behavior: "render",
  },

  root: {
    behavior: "detect",
  },
}
```

## 35.3 ロケール正規化

```text
en-US → en-us
ja-JP → ja-jp
zh-Hant-TW → zh-hant-tw
```

設定値では BCP 47 形式を保持し、URL では小文字化する。

## 35.4 Page フォールバック

対象ロケールにページがない場合、デフォルトロケールのページをビルド時に複製して静的ルートを生成する。

方式:

* `render`
* `redirect`
* `not-found`

標準値は `render`。

## 35.5 Collection フォールバック

Collection 全体が対象ロケールにない場合:

* `render`
* `redirect`
* `hidden`
* `not-found`

から選択する。

## 35.6 言語切り替え

同じ Page ID の翻訳へ移動する。

翻訳がない場合:

1. フォールバックページ
2. 同じ Section のトップ
3. Collection トップ
4. ロケールのサイトトップ

の順で解決する。

---

# 36. Markdown 処理

処理パイプライン:

```text
Markdown source
    ↓
remark parse
    ↓
built-in remark plugins
    ↓
user remark plugins
    ↓
remark-rehype
    ↓
built-in rehype plugins
    ↓
user rehype plugins
    ↓
Shiki
    ↓
HTML serialization
    ↓
Generated page data
```

標準対応:

* CommonMark
* GitHub Flavored Markdown
* 表
* タスクリスト
* 取り消し線
* 脚注
* 見出し ID
* 見出しアンカー
* コードブロック
* インラインコード
* 画像
* 引用
* 外部リンク

---

# 37. Shiki

```ts
markdown: {
  shiki: {
    themes: {
      light: "github-light",
      dark: "github-dark",
    },

    unknownLanguage: "warning",
  },
}
```

不明言語:

* `error`
* `warning`
* `plain-text`

標準値は `warning`。

コードハイライトはビルド時に行い、ブラウザ上で再実行しない。

---

# 38. テーマ要件

標準テーマは以下を提供する。

* Global Header
* Collection Switcher
* Collection Sidebar
* 多段階ナビゲーション
* 折りたたみ Section / Group
* パンくずリスト
* ページ内目次
* 前後ページ
* Collection トップ
* Portal トップ
* 言語切り替え
* ライト・ダークモード
* フォールバック通知
* モバイルナビゲーション
* 404 ページ

現在ページの祖先ノードは自動展開する。

---

# 39. Generated Page

```ts
export interface GeneratedPage {
  pageId: string;

  collectionId?: string;

  route: string;
  segments: string[];

  locale: string;
  contentLocale: string;

  sourcePath: string;
  metadataPath?: string;

  isFallback: boolean;
  fallbackSource?: string;

  title: string;
  description?: string;

  html: string;

  headings: GeneratedHeading[];

  hierarchy: PageHierarchyNode[];
  breadcrumbs: GeneratedBreadcrumb[];

  navigationPosition?:
    GeneratedNavigationPosition;

  draft: boolean;
  hidden: boolean;

  metadata: GeneratedMetadata;
}
```

---

# 40. 生成データ

大規模サイト向けにロケールと Collection 単位で分割する。

```text
.makit/generated/
├── site.json
├── locales.json
├── collections.json
├── navigation/
│   ├── en-us/
│   │   ├── global.json
│   │   ├── makit.json
│   │   └── enduroq.json
│   └── ja-jp/
│       ├── global.json
│       └── makit.json
├── pages/
│   ├── en-us/
│   │   ├── makit/
│   │   └── enduroq/
│   └── ja-jp/
│       └── makit/
└── indexes/
    ├── page-map.json
    ├── route-map.json
    ├── collection-map.json
    └── translation-map.json
```

---

# 41. Next.js ルーティング

内部構成:

```text
.makit/app/
├── layout.tsx
├── page.tsx
├── not-found.tsx
└── [locale]/
    └── [[...slug]]/
        └── page.tsx
```

Collection 専用の Next.js Route は作成しない。

Makit Core が生成した route map からページを解決する。

```ts
export function generateStaticParams() {
  return pages.map((page) => ({
    locale: page.locale.toLowerCase(),
    slug: page.segments,
  }));
}
```

---

# 42. CLI

## `makit init`

プロジェクトを初期化する。

## `makit dev`

開発サーバーを起動し、Markdown と TypeScript メタデータを監視する。

## `makit build`

静的サイトを生成する。

## `makit preview`

`outDir` を静的サーバーで配信する。

## `makit clean`

`.makit/` と出力ディレクトリを削除する。

## `makit check`

以下を検証する。

* 設定
* TypeScript メタデータ
* Collection
* Navigation
* Page ID
* Route
* 翻訳
* 内部リンク
* Deployment Adapter

## `makit adapter generate`

設定済み Adapter の固有ファイルを生成する。

---

# 43. ファイル監視

`makit dev` は以下を監視する。

* Markdown
* `.meta.ts`
* `collection.makit.ts`
* `navigation.makit.ts`
* `category.makit.ts`
* `makit.config.ts`
* メタデータから import されたローカルファイル
* `publicDir`
* カスタム CSS

変更時の処理:

| 対象                  | 処理                        |
| ------------------- | ------------------------- |
| Markdown            | 対象ページ再生成                  |
| Page Metadata       | ページ、Route、Navigation 再生成  |
| Category Metadata   | 対象階層と Navigation 再生成      |
| Navigation Metadata | Collection Navigation 再生成 |
| Collection Metadata | Collection 全体再生成          |
| Config              | サイト全体再生成                  |
| import 依存ファイル       | 参照元メタデータ再評価               |
| CSS                 | スタイル再読込                   |
| Public Asset        | アセット再同期                   |

---

# 44. Deployment Adapter

Adapter はファクトリー関数で指定する。

```ts
import cloudflarePages from
  "@makit/adapter-cloudflare-pages";

export default defineConfig({
  deployment: {
    adapter: cloudflarePages(),
  },
});
```

サードパーティー:

```ts
import customAdapter from
  "@example/makit-adapter";

export default defineConfig({
  deployment: {
    adapter: customAdapter({
      option: true,
    }),
  },
});
```

文字列指定は提供しない。

```ts
// 非対応
adapter: "netlify"
```

初期公式 Adapter:

* `@makit/adapter-cloudflare-pages`
* `@makit/adapter-github-pages`
* `@makit/adapter-netlify`
* `@makit/adapter-vercel`

Adapter は以下のフェーズを持つ。

1. `resolve`
2. `validate`
3. `generate`

---

# 45. エラー

以下はビルドを停止する。

* TypeScript メタデータを評価できない
* default export がない
* 不正な定義関数を使用している
* 非同期メタデータ
* シリアライズ不能な値
* 循環参照
* Collection ID 重複
* Collection path 重複
* Page ID 重複
* Route 重複
* Navigation の循環参照
* 存在しない Page ID の参照
* 存在しない Collection の参照
* 正規ナビゲーション位置が存在しない
* locale 正規化後の重複
* `defaultLocale` が存在しない
* Adapter Resolve / Validate エラー
* Next.js ビルド失敗

---

# 46. 警告

以下は標準では警告とする。

* `.meta.ts` がないページ
* H1 がないページ
* 自動生成された Page ID
* Navigation に含まれないページ
* ページの複数配置に正規位置がない
* 深すぎる Navigation
* 空の Section / Group
* 翻訳が存在しない
* Collection 全体のフォールバック
* 不明な Shiki 言語
* 壊れた内部リンク
* メタデータ内の環境変数参照
* プロジェクト外ファイルの import
* メタデータ評価時間が長い
* 非推奨フィールド
* Deployment Target の非対応機能

---

# 47. Strict Mode

```ts
validation: {
  strict: true,

  failOn: [
    "missing-page-metadata",
    "generated-page-id",
    "broken-link",
    "missing-translation",
  ],
}
```

警告コード単位でエラーへ昇格できる。

---

# 48. 後方互換性

## 48.1 Collection を省略したサイト

```ts
export default defineConfig({
  title: "Makit Documentation",
  sourceDir: "docs",
});
```

内部的に暗黙の Collection を生成する。

```ts
{
  id: "default",
  title: config.title,
  path: "",
  sourceDir: config.sourceDir,
}
```

## 48.2 Markdown 単体

以下は引き続き動作する。

```text
docs/
├── index.md
├── getting-started.md
└── guides/
    └── configuration.md
```

構造メタデータがない場合はディレクトリと Markdown から自動生成する。

## 48.3 YAML Front Matter

フラットな(1階層の)スカラー値のみの Front Matter は §17 の通り標準でサポートする。

`navigation` や `taxonomy` のようなネストした値を含む既存サイトの Front Matter は非対応とする。

既存サイト移行向けに、将来以下のような互換プラグインを提供可能とする。

```ts
import frontMatterCompat from
  "@makit/plugin-frontmatter";

export default defineConfig({
  plugins: [
    frontMatterCompat(),
  ],
});
```

---

# 49. パッケージ構成

```text
packages/
├── makit/
├── cli/
├── core/
├── metadata/
├── markdown/
├── runtime/
├── theme-default/
├── adapter-cloudflare-pages/
├── adapter-github-pages/
├── adapter-netlify/
└── adapter-vercel/
```

## `metadata`

責務:

* TypeScript メタデータ読込
* `define*` API
* 型
* import 依存追跡
* シリアライズ検証
* キャッシュ
* 診断

---

# 50. MVP 対象

## 基盤

* Next.js App Router
* Static Export
* `.makit/`
* TypeScript 設定読込
* キャッシュ
* ファイル監視

## メタデータ

* `makit.config.ts`
* `collection.makit.ts`
* `navigation.makit.ts`
* `category.makit.ts`
* `{page}.meta.ts`
* `defineConfig`
* `defineCollection`
* `defineNavigation`
* `defineCategory`
* `definePageMetadata`
* ローカル TypeScript import
* import 依存監視
* JSDoc と型補完
* 同期メタデータ
* シリアライズ検証

## 階層構造

* 複数 Collection
* 暗黙 Collection
* Section
* Group
* Page
* Global Navigation
* Collection Navigation
* Collection Top
* Portal Home
* Breadcrumbs
* 前後ページ
* URL と Navigation の分離
* Page の複数配置
* 正規 Navigation 位置

## 国際化

* ロケール URL
* Page フォールバック
* Collection フォールバック
* 言語切り替え
* `lang`
* `dir`
* canonical
* `hreflang`
* ロケール別 Navigation
* ロケール別 Sitemap

## Markdown

* remark
* rehype
* GFM
* Shiki
* 見出しアンカー
* ページ内目次
* コードコピー

## Deployment

* Adapter Factory
* Cloudflare Pages
* GitHub Pages
* Netlify
* Vercel
* Redirect
* Headers
* GitHub Actions Workflow
* `.nojekyll`
* `CNAME`

---

# 51. MVP 対象外

* 非同期メタデータ
* YAML 構造メタデータ
* ネストした値を含む YAML Front Matter(フラットな Front Matter は §17 の通りサポート)
* MDX
* ユーザー定義 React コンポーネント
* Collection ごとの独立テーマ
* Collection ごとの独立ドメイン
* Collection ごとの独立ビルド
* Collection ごとの Adapter
* 複数リポジトリ統合
* リモート Collection
* バージョニング
* 組み込み全文検索 UI
* OpenAPI 自動生成
* TypeDoc 自動生成
* Mermaid
* 数式
* PDF
* Edge Function
* Makit CLI からの直接デプロイ

---

# 52. 受け入れ基準

1. `makit.config.ts` を TypeScript で記述できる
2. Collection Metadata を TypeScript で記述できる
3. Navigation Metadata を TypeScript で記述できる
4. Category Metadata を TypeScript で記述できる
5. Page Metadata を TypeScript で記述できる
6. 各メタデータのキーと列挙値が補完される
7. JSDoc から説明と初期値を確認できる
8. メタデータ間で共通 TypeScript モジュールを再利用できる
9. import されたローカルファイルの変更が `makit dev` に反映される
10. 非同期または不正なメタデータを検出できる
11. Markdown 単体のページも生成できる
12. メタデータがないページ情報を H1 やファイル名から推定できる
13. 複数 Collection を構築できる
14. Collection ごとに URL と Navigation を持てる
15. Section と Group を入れ子にできる
16. Navigation 階層と URL 階層を分離できる
17. 同じ Page を複数の Navigation 位置へ配置できる
18. Page ID で翻訳を対応付けられる
19. 存在しない翻訳をデフォルトロケールへフォールバックできる
20. Portal 型トップページを生成できる
21. Breadcrumbs を生成できる
22. Navigation 順に前後ページを解決できる
23. Deployment Adapter をファクトリー関数で指定できる
24. Adapter 未指定でも汎用静的サイトを生成できる
25. `.makit/` を削除して再生成できる
26. `dist/` のみで静的配信できる
27. CI で `makit check` を非対話実行できる

---

# 53. 完全な設定例

```ts
import { defineConfig } from "makit";

import cloudflarePages from
  "@makit/adapter-cloudflare-pages";

export default defineConfig({
  title: "Natsuneko Documentation",

  description:
    "Documentation for Natsuneko products and services",

  siteUrl: "https://docs.natsuneko.com",

  sourceDir: "docs",
  publicDir: "public",
  outDir: "dist",

  collections: {
    mode: "discover",
  },

  home: {
    layout: "portal",

    featuredCollections: [
      "makit",
      "enduroq",
      "catalyst",
    ],

    sections: [
      {
        title: {
          "en-US": "Developer Tools",
          "ja-JP": "開発者向けツール",
        },

        collections: [
          "makit",
          "enduroq",
        ],
      },
      {
        title: {
          "en-US": "Services",
          "ja-JP": "サービス",
        },

        collections: [
          "catalyst",
        ],
      },
    ],
  },

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

    collectionFallback: {
      behavior: "render",
    },

    root: {
      behavior: "detect",
    },

    localeSwitcher: {
      missingPage: "fallback",
    },
  },

  navigation: {
    global: [
      {
        title: "Products",
        items: [
          {
            title: "Makit",
            collection: "makit",
          },
          {
            title: "Enduroq",
            collection: "enduroq",
          },
          {
            title: "Catalyst",
            collection: "catalyst",
          },
        ],
      },
      {
        title: "Resources",
        items: [
          {
            title: "GitHub",
            href:
              "https://github.com/example",
            external: true,
          },
        ],
      },
    ],

    pagination: {
      enabled: true,
      crossSection: true,
    },
  },

  theme: {
    colorScheme: "system",

    breadcrumbs: {
      enabled: true,
      showHome: true,
      showCurrentPage: true,
    },

    codeTheme: {
      light: "github-light",
      dark: "github-dark",
    },
  },

  markdown: {
    gfm: true,
    headingIds: true,

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

  sitemap: {
    enabled: true,
    includeFallbackPages: false,
  },

  deployment: {
    adapter: cloudflarePages({
      projectName: "natsuneko-documentation",

      redirects: {
        mode: "native",
      },

      headers: {
        enabled: true,
      },
    }),
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
    disallowFrontMatter: true,

    failOn: [
      "duplicate-route",
      "duplicate-page-id",
    ],
  },
});
```
