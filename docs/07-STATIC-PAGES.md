# 固定ページ仕様

## 1. 概要

Makit は、Markdown のドキュメントページとは別に、利用者が React コンポーネントまたは HTML 断片で自由に記述する**固定ページ（Static Page）**を提供する。

主な用途:

- プロダクト紹介などのランディングページ（LP）をサイトトップに置く
- `/pricing`、`/showcase`、`/playground` のような、ドキュメントの外枠（Sidebar / ToC）を持たない独自ページを任意の URL に置く

最小の構成:

```text
my-docs/
├── docs/
│   └── index.md
├── pages/
│   ├── index.tsx          → /
│   ├── pricing.tsx        → /pricing/
│   ├── pricing.meta.ts
│   └── about.html         → /about/
└── makit.config.ts
```

```tsx
// pages/pricing.tsx
import type { StaticPageComponentProps } from "@natsuneko-laboratory/makit-runtime";

export default function Pricing({ locale }: StaticPageComponentProps) {
  return (
    <section className="mx-auto max-w-5xl py-24">{locale === "ja-jp" ? "料金" : "Pricing"}</section>
  );
}
```

固定ページは Next.js のルートを利用者へ露出する機能ではない。利用者は `app/` やルーティングを記述せず、Makit が規約ディレクトリを走査して route map へ登録する（spec §5.3、§41）。成果物は引き続き Node.js ランタイムを必要としない静的ファイルである（spec §5.4）。

---

## 2. 用語

### Static Page

`pages/` 配下のファイルから生成されるページ。ナビゲーション、パンくずリスト、前後ページ、ページ内目次を持たない。

### Static Page ID

拡張子とロケール接尾辞を除いた `pages/` からの相対パス。`pages/company/about.ja-jp.html` の ID は `company/about` となる。

### Static Page Component

`.tsx` / `.jsx` で記述された固定ページの本文。default export の React コンポーネント。

### HTML Fragment

`.html` で記述された固定ページの本文。`<body>` の内側に置かれる HTML の断片。

---

## 3. 設計原則

### 3.1 Next.js を隠蔽したまま自由度を提供する

固定ページは route map の新しい種別として実装し、既存の `[[...slug]]` ルートから描画する。Next.js の Route ファイルを固定ページごとに生成することはしない。これにより、ルート衝突の検出、ロケールゲートウェイ（spec §35.7）、`basePath`、`trailingSlash` が既存ページと同一の仕組みで扱われる。

### 3.2 コンポーネントはモジュール指定子として扱う

テーマ（THEME §3.4）と同様に、Makit CLI は Static Page Component を評価しない。生成される `.makit/app/static-pages.js` の静的 import へ変換し、Next.js のビルドが読み込む。

### 3.3 メタデータは `.meta.ts` に書く

タイトルなどのメタデータは同名の `.meta.ts` に記述する（spec §9.1）。CLI が TSX を評価せずにメタデータを得られるようにするためである。

### 3.4 ドキュメントの機能へは載せない

固定ページは Markdown パイプライン、ナビゲーション、`llms.txt`、Markdown エンドポイントの対象外とする。検索は明示的に有効化したページのみ対象とする（§11）。

---

## 4. 規約ディレクトリ

既定の探索ディレクトリはプロジェクトルートの `pages/` とする。`staticPages.dir` で変更でき、`false` で機能全体を無効化する（§13）。

対象とする拡張子は `.tsx`、`.jsx`、`.html` とする。

以下は探索対象から除外する。

- `_` で始まるファイル、および `_` で始まるディレクトリ配下のすべてのファイル
- `.meta.ts`（メタデータとして扱う）
- 上記以外の拡張子のファイル
- ドットファイル、`node_modules/`

`_` による除外は、固定ページから import する部品を同じディレクトリへ置けるようにするためである。

```text
pages/
├── index.tsx
├── _components/
│   └── hero.tsx      → 除外（index.tsx から import する用途）
└── _utils.ts         → 除外
```

`pages/` が存在しない場合は何もしない（エラーにも警告にもしない）。

---

## 5. URL

### 5.1 導出規則

Static Page ID をそのまま URL のパスとする。ファイル名が `index` の場合はディレクトリの URL となる。

```text
pages/index.tsx           → /
pages/pricing.tsx         → /pricing/
pages/company/about.html  → /company/about/
pages/company/index.tsx   → /company/
```

固定ページはナビゲーションに現れないため、順序プレフィックス（ORDER-PREFIX）と Route Group（ROUTE-GROUPS）は解釈しない。`pages/01-pricing.tsx` の URL は `/01-pricing/` となる。

`basePath` と `build.trailingSlash` は Markdown ページと同様に適用する（spec §28）。

### 5.2 国際化

i18n が有効な場合、固定ページはロケール接頭辞の下に生成される（spec §35.1）。

```text
pages/pricing.tsx → /en-us/pricing/, /ja-jp/pricing/
```

ロケールなし URL（`/pricing/`）は既存のロケールゲートウェイ（spec §35.7）で解決される。

---

## 6. ロケール別ファイル

ファイル名の拡張子の直前に urlLocale を付けると、そのロケール専用のファイルとなる。

```text
pages/
├── about.html          → ロケール別ファイルを持たない全ロケールで使用
└── about.ja-jp.html    → ja-jp でのみ使用
```

解決規則:

1. ロケール別ファイルがあれば、そのロケールではそれを使う
2. なければ、接尾辞なしのファイルを使う
3. どちらも無いロケールでは、その固定ページは存在しない

接尾辞なしのファイルが無く、ロケール別ファイルのみがある場合、その固定ページはロケール別ファイルが存在するロケールにのみ生成される。

ロケール別ファイルと接尾辞なしのファイルで拡張子が異なってもよい（`about.tsx` と `about.ja-jp.html`）。

i18n が無効な場合、ロケール接尾辞は解釈しない。`about.ja-jp.html` は ID `about.ja-jp` の固定ページとなる。

---

## 7. Static Page Component

### 7.1 規約

`.tsx` / `.jsx` ファイルは React コンポーネントを default export する。

```tsx
import type { StaticPageComponentProps } from "@natsuneko-laboratory/makit-runtime";

export default async function Landing({ locale, page, site }: StaticPageComponentProps) {
  return (
    <main>
      <h1>{page.title}</h1>
      <p>{site.description}</p>
    </main>
  );
}
```

### 7.2 Props

```ts
export interface StaticPageComponentProps {
  /** URL-facing locale (e.g. "ja-jp"). */
  locale: string;
  page: GeneratedStaticPage;
  site: SiteData;
  i18n: I18nData;
}
```

すべての props は直列化可能な値とする。したがって Static Page Component は Server Component と Client Component（`"use client"`）のどちらでも実装できる。

### 7.3 Server Component / Client Component

THEME §11 の制約に従う。

- 既定は Server Component であり、`async` にできる
- Server Component は `@natsuneko-laboratory/makit-runtime` の生成データローダー（`getCollections` など、spec §40）を呼び出せる
- Client Component から値を import する場合は `@natsuneko-laboratory/makit-runtime/client` を使う

### 7.4 モジュール解決

固定ページは利用者のプロジェクト内に置かれるため、THEME §11「モジュール解決」と同じ `turbopack.resolveAlias` を共有する。利用者は `react`、`next` をインストールせずに固定ページを記述できる。

`next/link` を使ったリンクには `basePath` が自動で付与される。

### 7.5 スタイル

Tailwind のユーティリティクラス、CSS Modules、素の CSS のいずれでも記述できる（THEME §3.6）。Tailwind のクラス走査対象は §12.3 で登録する。

---

## 8. HTML Fragment

### 8.1 規約

`.html` ファイルには `<body>` の内側に置く HTML の断片を記述する。

```html
<section class="mx-auto max-w-3xl py-24">
  <h1 class="text-4xl font-semibold">About</h1>
  <p>...</p>
  <a href="/pricing/">Pricing</a>
</section>
```

`<!doctype>`、`<html>`、`<head>`、`<body>` を含む完全な文書は想定しない。含まれる場合は `static-page-html-document` 警告を出し、パーサーが解釈した `<body>` の内容のみを断片として扱う。

### 8.2 処理

HTML Fragment はビルド時に読み込み、生成データ（§12.2）へ埋め込む。Markdown パイプライン（spec §36）は通さない。

唯一の加工として、ルート相対 URL へ `basePath` を付与する。

- 対象: `href`、`src` 属性のうち `/` で始まり `//` で始まらない値
- `srcset` は対象外とする
- 外部 URL、相対パス、アンカーのみ（`#...`）、`mailto:` などは変更しない
- `basePath` が空の場合は何も変更しない

```html
<!-- basePath: "/docs" -->
<a href="/pricing/">
  →
  <a href="/docs/pricing/">
    <img src="/og.png" /> → <img src="/docs/og.png" /> <a href="./a/"> → 変更なし</a></a
  ></a
>
```

ロケール接頭辞は付与しない。ロケールなし URL はロケールゲートウェイで解決される（spec §35.7）。

`<script>` 要素はそのまま出力する。ただし React の `dangerouslySetInnerHTML` で挿入されるため、クライアント側のナビゲーション後には実行されない。スクリプトが必要な固定ページは Static Page Component で記述する。

---

## 9. メタデータ

### 9.1 定義

同名の `.meta.ts` で定義する。ロケール別ファイルを含め、1 つの Static Page ID に対して `.meta.ts` は 1 つとする（`about.meta.ts`）。ロケールごとの値は `LocalizedValue` で記述する。

```ts
import { defineStaticPageMetadata } from "@natsuneko-laboratory/makit/metadata";

export default defineStaticPageMetadata({
  title: { "en-US": "Pricing", "ja-JP": "料金" },
  description: "Plans and pricing.",
  layout: "default",
  search: false,
  noindex: false,
  draft: false,
  image: "/og/pricing.png",
});
```

`about.ja-jp.meta.ts` のようなロケール別の `.meta.ts` は固定ページのメタデータとして扱わず、`static-page-locale-metadata` 警告を出して無視する。

### 9.2 型

```ts
export interface StaticPageMetadata {
  /** ページタイトル。`<title>` と `GeneratedStaticPage.title` に使う。 */
  title?: string | LocalizedValue<string>;

  description?: string | LocalizedValue<string>;

  /**
   * 外枠。
   * - "default": サイト共通の Header / Footer で包む
   * - "bare": 外枠を付けない
   * @default "default"
   */
  layout?: "default" | "bare";

  /**
   * サイト内検索の対象にするか。
   * @default false
   */
  search?: boolean;

  /** @default false */
  draft?: boolean;

  /** @default false */
  noindex?: boolean;

  /** @default false */
  nofollow?: boolean;

  /** Canonical URL の上書き。 */
  canonical?: string;

  /** OGP 画像。 */
  image?: string;
}
```

### 9.3 定義関数

`defineStaticPageMetadata` は `@natsuneko-laboratory/makit/metadata` から公開する。`definePageMetadata` など他の定義関数の結果を固定ページの `.meta.ts` が export した場合は、既存の「不正な定義関数」エラー（spec §45）とする。

メタデータの評価制約（spec §20）、TypeScript ローダー（spec §22）、依存ファイルの追跡は Page メタデータと共通とする。

### 9.4 タイトルの解決

1. `.meta.ts` の `title`（ロケールに応じて解決）
2. Static Page ID の最終セグメント（`index` の場合はその親ディレクトリ名、ルートの `index` はサイトタイトル）

2 によって解決した場合は `static-page-missing-title` 警告を出す。

---

## 10. 外枠と `StaticPage` Slot

### 10.1 `StaticPage` Slot

THEME §5.1 の Page Slot に `StaticPage` を追加する。Server Component 専用、無効化不可とする。

```ts
export interface StaticPageProps {
  page: GeneratedStaticPage;
  site: SiteData;
  i18n: I18nData;
  locale: string;
  /** The resolved slot map (THEME §6). */
  components: ThemeComponents;
  /** Static Page Component の要素、または HTML Fragment を描画する要素。 */
  children: ReactNode;
}
```

`StaticPage` は本文を `children` として受け取り、外枠のみを担う。テーマは `StaticPage` を差し替えることで、固定ページの外枠を独自のものにできる。

### 10.2 既定の実装

`layout: "default"`:

```text
<div>
  <Header />            … サイト共通。検索、言語切替、テーマ切替を含む
  <main>{children}</main>
  <Footer />            … Footer Slot が無効化されていれば描画しない
</div>
```

- `<main>` には余白と最大幅を付けない。本文が全幅のレイアウトを描けるようにするためである
- 言語切替は、同じ固定ページの他ロケール版（`page.metadata.alternates`）へリンクする。他ロケール版が無いロケールはそのロケールのホームへリンクする

`layout: "bare"`:

```text
{children}
```

いずれの場合も `RootLayout`（`<html>`、`<body>`、テーマ変数、`globals.css`、解析タグ）は適用される。

`search: true` の場合、既定の実装は `children` を `data-pagefind-body` を持つ要素で包む（§11）。

### 10.3 Header actions の共通化

Header に渡す actions（`SearchDialog`、言語切替、`ThemeToggle`）の組み立ては、現在 `DocsPage` と `PortalHomePage` に重複している。`StaticPage` の追加に合わせて、これを `makit-runtime` 内部のヘルパーへ切り出し、3 つの Page Slot から共有する。ヘルパーは Slot ではなく、Slot Props も変更しない。

---

## 11. 検索

固定ページは既定で検索対象外とする。LP の宣伝文や独自 UI の文言が検索結果へ混ざることを避けるためである。

`search: true` の場合:

- 既定の `StaticPage` が本文を `data-pagefind-body` で包み、Pagefind の索引対象とする
- 開発サーバー用の簡易検索インデックス（`getSearchIndex`）に、タイトルと説明文を登録する

`StaticPage` を差し替えたテーマは、`page.search` を参照して `data-pagefind-body` を付与する責務を負う。

`search: false` の固定ページは `data-pagefind-body` を持たないため、Pagefind の索引対象にならない（ドキュメントページが `data-pagefind-body` を持つ限り、Pagefind はそれを持たないページを索引しない）。

---

## 12. 生成

### 12.1 route map

`RouteMapEntry` に固定ページの種別を追加する。

```ts
export type RouteMapEntry =
  | { kind: "page"; collectionId: string; pageId: string }
  | { kind: "portal"; route: string }
  | { kind: "static"; id: string; route: string };
```

`route` はロケールゲートウェイ（spec §35.7）と `getHomeRoute` が生成データを読まずにリンク先を得るために持つ。

登録順序:

1. Markdown ページ
2. 固定ページ（衝突は §16 のエラー）
3. サイトトップ（spec §33）。ロケールのルートに固定ページ `index` がある場合、サイトトップの解決は行わない

`getAllStaticParams` は `static` エントリも列挙する。

### 12.2 生成データ

```text
.makit/generated/
└── static-pages/
    ├── en-us/
    │   ├── index.json
    │   ├── pricing.json
    │   └── company/
    │       └── about.json
    └── ja-jp/
        └── ...
```

```ts
export interface GeneratedStaticPage {
  id: string;
  route: string;
  /** URL path segments below the locale prefix. */
  segments: string[];
  /** URL-facing locale this page is served under. */
  locale: string;
  /** Absolute path of the source file actually used for this locale. */
  sourcePath: string;
  /** Absolute path of the `.meta.ts`, when one exists. */
  metadataPath?: string;
  kind: "component" | "html";
  /** Key into `.makit/app/static-pages.js` (kind: "component" only). */
  componentKey?: string;
  /** Processed HTML Fragment (kind: "html" only). */
  html?: string;
  title: string;
  description?: string;
  layout: "default" | "bare";
  search: boolean;
  draft: boolean;
  metadata: GeneratedMetadata;
}
```

`GeneratedMetadata`（spec §39）の `alternates` には、同じ Static Page ID を持つ他ロケールの固定ページを登録する。

### 12.3 生成される app

`.makit/app/static-pages.js` に Static Page Component の静的 import を生成する。

```js
import StaticPage0 from "../../pages/index.tsx";
import StaticPage1 from "../../pages/pricing.tsx";
import StaticPage2 from "../../pages/pricing.ja-jp.tsx";

export const staticPageComponents = {
  index: StaticPage0,
  pricing: StaticPage1,
  "pricing.ja-jp": StaticPage2,
};
```

- キー（`componentKey`）はロケール接尾辞を含むファイル名から拡張子を除いたものとする
- このファイルは `generateApp` ではなくコンテンツ生成のたびに書き出す。`makit dev` 中のファイル追加を設定の再読み込みなしで反映するためである。書き込みは `atomicWriteFile` で行い、内容が変わらない場合は書き込まない
- 固定ページが 1 つも無い場合も、空のオブジェクトを export するファイルを生成する

`[[...slug]]` の `page.js` は `entry.kind === "static"` の場合に次を行う。

```js
const page = await getStaticPage(locale, entry.id);
const Component = page.componentKey ? staticPageComponents[page.componentKey] : undefined;
const { StaticPage } = themeComponents;

return (
  <StaticPage page={page} site={site} i18n={i18n} locale={locale} components={themeComponents}>
    {Component ? (
      <Component page={page} site={site} i18n={i18n} locale={locale} />
    ) : (
      <div dangerouslySetInnerHTML={{ __html: page.html }} />
    )}
  </StaticPage>
);
```

`generateMetadata` は `buildPageMetadata` を一般化したものを使い、`title`、`description`、canonical、hreflang、robots、OGP 画像を出力する。

### 12.4 Tailwind

`.makit/styles/globals.css` の `@source` に次を追加する。

```css
@source "<staticPages.dir の絶対パス>/**/*.{tsx,jsx,ts,js,html}";
```

`staticPages.dir` が `false` の場合、または存在しない場合は追加しない。

Turbopack の `root`（プロジェクトと runtime パッケージの共通祖先）の計算対象に `staticPages.dir` を含める。テーマのローカルファイルと同様、Turbopack がワークスペースルートを誤検出しないようにするためである。

### 12.5 sitemap

固定ページを `sitemap.xml` へ含める。`draft` と `noindex` のページは除外する。`alternates` を `xhtml:link` として出力する。

### 12.6 対象外の出力

固定ページは以下の対象外とする。

- `llms.txt`、`llms-full.txt`
- Markdown エンドポイント
- Collection Navigation、Global Navigation の自動生成
- パンくずリスト、前後ページ

Global Navigation（spec §26）から固定ページへリンクする場合は `href` で URL を指定する。

---

## 13. 設定

```ts
export default defineConfig({
  staticPages: {
    dir: "pages",
  },
});
```

```ts
export interface StaticPagesConfig {
  /**
   * 固定ページの探索ディレクトリ。プロジェクトルート基準。
   * `false` で固定ページ機能を無効化する。
   * @default "pages"
   */
  dir?: string | false;
}
```

`staticPages.dir` が `sourceDir`、`publicDir`、`outDir`、`theme.dir` と同一または入れ子の場合は `static-page-invalid-dir` エラーとする。

---

## 14. サイトトップとの関係

固定ページ `index`（`pages/index.tsx` など）は、ロケールのルート URL を占有する。

- `home` を設定していない場合: 固定ページ `index` がサイトトップとなる
- `home.layout` を明示している場合: `static-page-home-conflict` エラーとする
- Markdown のページがすでにルート URL を占有している場合（spec §33 の `existing`）: `static-page-route-conflict` エラーとする

ロケール別ファイル（`index.ja-jp.tsx`）のみがある場合、そのロケールのみ固定ページがトップとなり、他のロケールは従来どおりサイトトップを解決する。

---

## 15. dev サーバー

`makit dev` は `staticPages.dir` を監視する。

| 変更                           | 挙動                                               |
| ------------------------------ | -------------------------------------------------- |
| `.tsx` / `.jsx` の内容変更     | 何もしない（Turbopack の HMR に任せる）            |
| `.html` の内容変更             | コンテンツを再生成する                             |
| `.meta.ts` とその依存の変更    | コンテンツを再生成する                             |
| ファイルの追加・削除・名前変更 | コンテンツを再生成する（`static-pages.js` を含む） |

`draft: true` の固定ページは、Markdown ページと同様に `makit dev` では表示し、`makit build` では出力しない。

---

## 16. 診断

エラー（ビルド停止）:

| コード                       | 条件                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| `static-page-ambiguous-file` | 同一 Static Page ID・同一ロケールに対応するファイルが複数ある（`about.tsx` と `about.html`） |
| `static-page-route-conflict` | 固定ページの URL が Markdown ページ、Collection トップ、サイトトップの URL と重なる          |
| `static-page-home-conflict`  | 固定ページ `index` があり、`home.layout` も明示されている                                    |
| `static-page-unknown-locale` | i18n が有効で、ロケール接尾辞が設定されたどのロケールにも一致しない                          |
| `static-page-invalid-dir`    | `staticPages.dir` が他の管理ディレクトリと同一または入れ子                                   |

ロケール接尾辞の判定は i18n が有効な場合のみ、拡張子の直前のドット区切りの部分（大文字小文字を区別しない）に対して次のとおり行う。

1. 設定されたいずれかのロケールの urlLocale と一致する: そのロケールのロケール別ファイルとする
2. `/^[a-z]{2,3}-[a-z0-9]{2,8}$/i` に一致する（`xx-yy` 形式）が、どのロケールとも一致しない: `static-page-unknown-locale` エラーとする
3. それ以外: ロケール接尾辞ではなく ID の一部とする。`pricing.v2.tsx` は ID `pricing.v2`、`about.old.tsx` は ID `about.old` の固定ページとなる

警告（`validation.failOn` / `validation.strict` で昇格可能）:

| コード                        | 条件                                                                   |
| ----------------------------- | ---------------------------------------------------------------------- |
| `static-page-missing-title`   | タイトルをファイル名から導出した（§9.4）                               |
| `static-page-html-document`   | HTML Fragment に `<!doctype>`、`<html>`、`<head>`、`<body>` が含まれる |
| `static-page-locale-metadata` | ロケール別の `.meta.ts` がある（§9.1）                                 |

Static Page Component の default export の有無や型の適合は CLI では検査しない。Next.js のビルド（spec §45「Next.js ビルド失敗」）で検出される。

---

## 17. CLI

| コマンド      | 挙動                                                                 |
| ------------- | -------------------------------------------------------------------- |
| `makit dev`   | §15 に従って監視・再生成する                                         |
| `makit build` | 固定ページを含めて静的出力する                                       |
| `makit check` | 走査、メタデータ評価、衝突検出を行い、`static-page-*` 診断を報告する |
| `makit clean` | 変更なし                                                             |

---

## 18. 既存仕様への変更

- spec §4 の非目標「ユーザーによる任意の Next.js アプリケーション拡張」は維持する。固定ページは Makit が route map へ登録するページの一種であり、Next.js の拡張点を公開するものではない
- spec §33: 固定ページ `index` がサイトトップとなる場合を追加する（§14）
- spec §40: `static-pages/` を生成データへ追加する
- spec §41: `RouteMapEntry` に `static` を追加し、`.makit/app/static-pages.js` を内部構成へ追加する
- spec §45、§46: §16 の診断を追加する
- THEME §5.1: Page Slot に `StaticPage` を追加する
- THEME §13.1: `@source` に `staticPages.dir` を追加する

---

## 19. 非目標

- `<!doctype html>` から始まる完全な HTML 文書の無加工配信（`public/` を使う）
- Markdown / MDX による固定ページ
- 固定ページへの動的ルート（`[id].tsx` など）
- 固定ページのナビゲーション自動登録、パンくずリスト、前後ページ
- 固定ページの `llms.txt` / Markdown エンドポイント出力
- ロケール別の `.meta.ts`
- 固定ページ単位の `<head>` 要素の任意追加（スクリプト、スタイルシートの差し込み）

---

## 20. 受け入れ基準

1. `pages/pricing.tsx` が `/pricing/` として出力される
2. `pages/company/about.html` が `/company/about/` として出力される
3. `pages/index.tsx` があり `home` 未設定の場合、サイトトップが固定ページになる
4. `pages/index.tsx` と `home.layout` の明示が共存するとエラーになる
5. `_` で始まるファイル・ディレクトリが固定ページとして扱われない
6. i18n 有効時、接尾辞なしのファイルが全ロケールに生成される
7. `about.ja-jp.html` が ja-jp でのみ `about.html` を置き換える
8. ロケール別ファイルのみの固定ページが、そのロケールにのみ生成される
9. 未知のロケール接尾辞がエラーになる
10. 同一ロケールに `.tsx` と `.html` があるとエラーになる
11. 固定ページの URL が Markdown ページと重なるとエラーになる
12. `.meta.ts` の `title` / `description` が `<title>` / `<meta name="description">` に反映され、`LocalizedValue` がロケールごとに解決される
13. `.meta.ts` が無い場合、ファイル名からタイトルを導出し警告を出す
14. `layout: "default"` で Header / Footer が描画され、`layout: "bare"` で描画されない
15. `layout: "bare"` でもテーマ変数と `globals.css` が適用される
16. 固定ページの言語切替が同じ固定ページの他ロケール版へリンクする
17. `search: true` の固定ページのみ Pagefind の索引対象になる
18. Static Page Component が `async` の Server Component として生成データローダーを呼び出せる
19. `"use client"` の Static Page Component が描画される
20. 利用者のプロジェクトに `react` / `next` が無くても Static Page Component をビルドできる
21. 固定ページで使った Tailwind のクラスが CSS に含まれる
22. `basePath` 設定時、HTML Fragment のルート相対 `href` / `src` に `basePath` が付与され、相対パスと外部 URL は変更されない
23. 固定ページが `sitemap.xml` に含まれ、`noindex` / `draft` は除外される
24. 固定ページが `llms.txt` と Markdown エンドポイントに含まれない
25. `makit dev` 中に固定ページを追加すると、サーバーの再起動なしで表示される
26. `makit dev` 中に `.html` / `.meta.ts` を編集すると、ブラウザが更新される
27. テーマで `StaticPage` を差し替えると、固定ページの外枠が差し替わる
28. `staticPages.dir: false` で固定ページの走査が行われない
