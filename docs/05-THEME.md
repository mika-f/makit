# テーマ仕様

## 1. 概要

Makit は、生成されるサイトの見た目と DOM 構造を、利用者が部分的または全面的に差し替えられるテーマ機能を提供する。

差し替えの粒度は 3 段階とする。

1. **トークン**: `theme.colorScheme` / `theme.accentColor` / `theme.radius` などの既存設定と `styles` による CSS 追加のみで調整する（既存仕様、spec §23）。
2. **部分差し替え（Component Override）**: Header や Sidebar など、テーマを構成する個々のコンポーネントを、利用者の React コンポーネントへ差し替える。
3. **全面差し替え（Theme Package）**: すべてのページシェルを提供する npm パッケージまたはローカルディレクトリを指定し、既定テーマを丸ごと置き換える。

いずれの場合も、Makit が生成する成果物は Node.js ランタイムを必要としない静的ファイルであり続ける（spec §5.4）。

設定例:

```ts
export default defineConfig({
  title: "My Documentation",
  theme: {
    // 全面差し替え（省略時は既定テーマ）
    extends: "@acme/makit-theme-corporate",
    // 部分差し替え
    components: {
      Header: "./theme/header.tsx",
      Footer: { from: "@acme/makit-theme-corporate", export: "CompactFooter" },
      PrevNextLinks: false,
    },
  },
});
```

---

## 2. 用語

### Theme

`.makit/app` が読み込むページシェル一式。既定テーマ（Standard Theme）は `@natsuneko-laboratory/makit-runtime` が提供する。

### Theme Package

Theme を提供する npm パッケージ、またはプロジェクト内のローカルディレクトリ。Slot 名と同名の React コンポーネントを named export する。

### Slot

差し替え可能な単位。`Header`、`Sidebar`、`DocsPage` のように、パスカルケースの固定名を持つ（§5）。

Slot 名は Makit が列挙する閉じた集合であり、利用者が新しい Slot を追加することはできない。

### Slot Props

各 Slot が受け取る props の型。Makit の公開 API であり、セマンティックバージョニングの対象とする（§3.3）。

### Component Override

`theme.components` または規約ディレクトリ（§8）によって、特定の Slot だけを差し替えること。

### Component Reference

差し替え先コンポーネントを指す設定値。モジュール指定子（文字列）、`{ from, export }` オブジェクト、または `false`（Slot の無効化）を取る（§7.4）。

---

## 3. 設計原則

### 3.1 既定テーマは常に動作する

`theme.extends` も `theme.components` も指定しない場合、既定テーマがそのまま使われる。テーマ機能の導入によって既存の設定ファイルが動作を変えることはない。

### 3.2 差し替えは明示的

Theme Package は利用者が依存関係へ追加し、`makit.config.ts` で明示的に指定する（Adapter と同じ方針、ADAPTER §3.3）。

例外は規約ディレクトリ（§8）のみとし、これも探索対象ディレクトリを設定で変更・無効化できる。

### 3.3 Slot Props は公開 API

Slot Props は `@natsuneko-laboratory/makit-runtime` から型として公開する。差し替えたコンポーネントは、その型に適合する限り Makit のマイナーバージョン更新で壊れない。

Slot Props への必須プロパティ追加、既存プロパティの削除・型の非互換な変更はメジャー変更として扱う。

### 3.4 Component Reference はモジュール指定子で表す

`makit.config.ts` は Makit CLI（Node.js）のプロセスで評価されるが、コンポーネントは `.makit/app` の Next.js ビルドで読み込まれる。両者はモジュールグラフを共有しないため、設定にコンポーネントの実体を書くことはできない。

したがって Component Reference は常にモジュール指定子（文字列）で表現し、`.makit/app` 側の静的 import へ変換する（§10.1）。

```ts
// 不可: コンポーネントの実体を設定へ渡す
import Header from "./theme/header.tsx";
theme: { components: { Header } }

// 可: モジュール指定子を渡す
theme: { components: { Header: "./theme/header.tsx" } }
```

### 3.5 `.makit/` は再生成可能なまま維持する

差し替え結果は `.makit/app/theme.js` の生成内容として表れる。利用者がこのファイルを直接編集することは想定しない（spec §5.5）。

### 3.6 Tailwind CSS の利用を強制しない

差し替えコンポーネントは Tailwind のユーティリティクラス、CSS Modules、素の CSS のいずれでも記述できる。Tailwind を使う場合に限り、クラス走査のためのソース登録（§13.1）が必要になる。

### 3.7 Collection ごとのテーマは対象外

テーマはサイト単位で 1 つとする。Collection ごとに異なるテーマを適用する機能は引き続き対象外とする（spec §51）。ただし、差し替えたコンポーネントは props から `page.collectionId` を参照できるため、Collection ごとの分岐は利用者側で実装できる。

---

## 4. 差し替えの段階

| 段階 | 手段 | 主な用途 |
| --- | --- | --- |
| トークン | `theme.colorScheme` / `accentColor` / `radius` / `codeTheme`、`styles` | 色・角丸・カスタム CSS |
| 部分差し替え | `theme.components`、規約ディレクトリ | Header のロゴ構成変更、Footer 追加要素、独自 Sidebar |
| 全面差し替え | `theme.extends` | 既存デザインシステムへの統合、独自レイアウト |

段階は排他ではなく、`theme.extends` で指定したテーマの一部をさらに `theme.components` で差し替えられる（§7.5）。

---

## 5. Slot

### 5.1 Page Slot

ページ全体の構造を担う Slot。すべて **Server Component 専用**とする（§11）。

| Slot | Props | 無効化 | 説明 |
| --- | --- | --- | --- |
| `RootLayout` | `RootLayoutProps` | 不可 | `<html>` と `<body>` を含むドキュメントシェル |
| `DocsPage` | `DocsPageProps` | 不可 | 通常ページのシェル（Header / Sidebar / 本文 / ToC / Footer） |
| `PortalHomePage` | `PortalHomePageProps` | 不可 | Portal レイアウトのサイトトップ（spec §33.2） |
| `RootPage` | `RootPageProps` | 不可 | i18n ルート（`/`）のロケール判定・選択ページ（spec §35.1） |
| `NotFoundPage` | `NotFoundPageProps` | 不可 | 404 ページ |

### 5.2 Part Slot

ページ内の構成要素を担う Slot。Server Component と Client Component のどちらでも実装できる（§11 の制約に従う）。

| Slot | Props | 無効化 | 既定の実装形態 |
| --- | --- | --- | --- |
| `Header` | `HeaderProps` | 不可 | Server |
| `Footer` | `FooterProps` | 可 | Server |
| `Sidebar` | `SidebarProps` | 可 | Server |
| `NavigationItems` | `NavigationItemsProps` | 不可 | Server |
| `Breadcrumbs` | `BreadcrumbsProps` | 可 | Server |
| `PageHeader` | `PageHeaderProps` | 可 | Server |
| `PageContent` | `PageContentProps` | 不可 | Server |
| `PrevNextLinks` | `PrevNextLinksProps` | 可 | Server |
| `TableOfContents` | `TableOfContentsProps` | 可 | Client |
| `PageActions` | `PageActionsProps` | 可 | Client |
| `SearchDialog` | `SearchDialogProps` | 可 | Client |
| `CollectionSwitcher` | `CollectionSwitcherProps` | 可 | Server |
| `LocaleSwitcher` | `LocaleSwitcherProps` | 可 | Server |
| `ThemeToggle` | `ThemeToggleProps` | 可 | Client |
| `FallbackNotice` | `FallbackNoticeProps` | 可 | Server |
| `ThemeVariables` | `ThemeVariablesProps` | 不可 | Server |
| `ThemeScript` | `ThemeScriptProps` | 可 | Server（inline script） |

「無効化 可」の Slot は `false` を指定して描画を止められる（§7.4）。「不可」の Slot に `false` を指定した場合は `theme-slot-not-optional` エラーとする。

`PageHeader` は本仕様で新設する Slot であり、既定テーマが `DocsPage` 内へ直接記述している `<h1>` とページ説明文を切り出したものとする。

`PageActions` は `TableOfContents` の内側に描画されるが、`TableOfContents` は Client Component であるため、コンポーネント参照として渡すことはできない（§11.4）。`DocsPage` が `PageActions` を要素として構築し、`TableOfContents` の `actions` prop（`ReactNode`）へ渡す。これにより、`PageActions` を Server Component へ差し替えた場合も動作する。

### 5.3 Slot ではないもの

以下は既定テーマの内部実装であり、差し替え対象としない。

* `CodeCopyEnhancer`（`PageContent` 内部のコピーボタン付与）
* `RootDetect`（`RootPage` 内部のロケール判定）
* `AnalyticsScripts`（解析タグ注入。テーマの責務ではない）
* Markdown 本文の HTML 要素（`h2`、`table`、`pre` など）

Markdown 本文は `page.html` として文字列で渡されるため、要素単位の React コンポーネントマッピング（MDX 的な差し替え）は提供しない。要素単位の見た目は CSS（`styles`）で調整する。

---

## 6. Slot Props

Slot Props は `@natsuneko-laboratory/makit-runtime` から export する。以下は主要な Slot の定義とする（既存実装からの変更点のみ注記する）。

```ts
export interface RootLayoutProps {
  site: SiteData;
  /** `<html>` へ展開する属性（`lang`、`data-theme`、`suppressHydrationWarning`）。 */
  htmlProps: ComponentProps<"html">;
  /** `<body>` へ展開する属性（dev サーバーの再読込マーカーを含む）。 */
  bodyProps: ComponentProps<"body">;
  /** `<body>` 先頭へ描画する Makit 提供ノード（CSS 変数、テーマ判定スクリプト、解析タグ）。 */
  bodyStart: ReactNode;
  components: ThemeComponents;
  children: ReactNode;
}

export interface DocsPageProps {
  page: GeneratedPage;
  site: SiteData;
  i18n: I18nData;
  navigation: ResolvedNavNode[];
  /** 解決済みの Part Slot 集合（§12）。 */
  components: ThemeComponents;
}

export interface PageHeaderProps {
  page: GeneratedPage;
}

export interface HeaderProps {
  header: HeaderData;
  siteTitle: string;
  homeHref: string;
  actions?: ReactNode;
  globalNavigation?: readonly GlobalNavigationGroup[];
}

export interface SidebarProps {
  navigation: readonly ResolvedNavNode[];
  currentRoute: string;
  components?: ThemeComponents;
}

export interface TableOfContentsProps {
  headings: readonly GeneratedHeading[];
  minDepth: number;
  maxDepth: number;
  /** 見出し一覧の下へ描画するページ操作。要素として渡す（§5.2、§11.4）。 */
  actions?: ReactNode;
}
```

既存コンポーネントの props は原則としてそのまま Slot Props とする。本仕様で追加するのは次の 4 点のみとする。

1. すべての Page Slot への `components` の追加（必須）。既定実装が使わない Slot（`RootLayout`、`RootPage`、`NotFoundPage`）にも渡す。差し替え実装が Part Slot を再利用できるようにするためである（例: 独自 404 ページで `Header` を使う）。
2. 子 Slot を描画する Part Slot（`Sidebar`）への `components` の追加（省略可）。
3. `RootLayout` の新設に伴う `RootLayoutProps`、`PageHeader` の新設に伴う `PageHeaderProps`。
4. `TableOfContents` の `actions`（`ReactNode`）。既定実装が内部で `PageActions` を直接描画していたものを、外から渡す形に変える（§5.2）。

props を持たない Slot（`ThemeToggle`、`ThemeScript`）も、将来の拡張に備えて空の props 型を定義する。

---

## 7. 設定

```ts
export interface ThemeConfig {
  // 既存
  colorScheme?: MakitColorScheme;
  accentColor?: string;
  radius?: MakitRadius;
  breadcrumbs?: BreadcrumbsConfig;
  codeTheme?: string | { light: string; dark: string };

  // 追加
  /** 基底テーマのモジュール指定子。省略時は既定テーマ。 */
  extends?: string;
  /** Slot 単位の差し替え。 */
  components?: ThemeComponentsConfig;
  /** 規約ディレクトリ。`false` で探索を無効化する。@default "theme" */
  dir?: string | false;
}

export type ThemeComponentsConfig = {
  [K in ThemeSlotName]?: ThemeComponentRef;
};

export type ThemeComponentRef =
  | string
  | { from: string; export?: string }
  | false;
```

### 7.1 `theme.extends`

基底テーマのモジュール指定子を指定する。

```ts
theme: {
  extends: "@acme/makit-theme-corporate",
}
```

相対パス（`./` または `../` で始まる値）はプロジェクトルート基準のローカルテーマとして解決する。

```ts
theme: {
  extends: "./theme",
}
```

基底テーマが提供しない Slot は既定テーマの実装で補完する。したがって Theme Package はすべての Slot を実装する義務を負わない（§9.5）。

`extends` の連鎖（テーマ A が `extends` でテーマ B を指定する）は提供しない。合成は Makit 側で 1 段階のみ行う。

### 7.2 `theme.components`

Slot 名をキー、Component Reference を値とするオブジェクトを指定する。

```ts
theme: {
  components: {
    Header: "./theme/header.tsx",
    Footer: { from: "@acme/ui", export: "DocsFooter" },
    PrevNextLinks: false,
  },
}
```

未知の Slot 名は `theme-unknown-slot` エラーとする。

### 7.3 `theme.dir`

規約ディレクトリのパス（プロジェクトルート基準）。既定値は `"theme"` とする。`false` を指定すると規約による探索を行わない。

### 7.4 Component Reference

| 形式 | 意味 |
| --- | --- |
| `"./theme/header.tsx"` | ローカルファイルの default export |
| `"@acme/ui"` | パッケージの default export |
| `{ from: "@acme/ui", export: "DocsFooter" }` | 指定した named export |
| `{ from: "./theme/header.tsx" }` | `export` 省略時は default export |
| `false` | Slot を無効化する（何も描画しない） |

相対パスはプロジェクトルート基準で解決し、`.makit/app` からの相対パスへ変換して埋め込む。拡張子は省略できず、明示する。

`false` は「その Slot の位置に何も描画しない」ことを意味する。親レイアウトのグリッド構成は既定テーマ側で調整する（例: `Sidebar: false` の場合、`DocsPage` は `page.sidebar` が `false` のときと同じ 1 カラム構成になる）。

### 7.5 解決順序

各 Slot の実装は次の優先順位で決定する。

1. `theme.components` の明示指定
2. 規約ディレクトリ（`theme.dir`）内の該当ファイル
3. `theme.extends` で指定したテーマの export
4. 既定テーマの実装

1 と 2 が同時に存在する場合、1 を採用し、2 は無視する。この場合は警告を出さない（明示指定が意図的な上書きであるため）。

### 7.6 型

Slot 名の集合は型として公開する。

```ts
export type ThemeSlotName =
  | "RootLayout"
  | "DocsPage"
  | "PortalHomePage"
  | "RootPage"
  | "NotFoundPage"
  | "Header"
  | "Footer"
  | "Sidebar"
  | "NavigationItems"
  | "Breadcrumbs"
  | "PageHeader"
  | "PageContent"
  | "PrevNextLinks"
  | "TableOfContents"
  | "PageActions"
  | "SearchDialog"
  | "CollectionSwitcher"
  | "LocaleSwitcher"
  | "ThemeToggle"
  | "FallbackNotice"
  | "ThemeVariables"
  | "ThemeScript";
```

差し替えコンポーネント側では、`satisfies` によって props の適合を検査できる。

```tsx
import type { HeaderProps } from "@natsuneko-laboratory/makit-runtime";

export default function Header({ header, siteTitle, homeHref, actions }: HeaderProps) {
  return <header>{/* ... */}</header>;
}
```

---

## 8. 規約ディレクトリ

`theme.dir`（既定 `theme/`）直下のファイル名から Slot を自動的に対応付ける。ファイル名は Slot 名のケバブケースとする。

```text
theme/
├── header.tsx            → Header
├── footer.tsx            → Footer
├── page-header.tsx       → PageHeader
└── docs-page.tsx         → DocsPage
```

対応する拡張子は `.tsx`、`.jsx`、`.ts`、`.js` とし、この順で最初に見つかったものを採用する。同一 Slot に複数の拡張子が存在する場合は `theme-ambiguous-slot-file` エラーとする。

いずれの Slot 名にも対応しないファイルは無視する。これはヘルパーモジュールを同じディレクトリへ置けるようにするためである。

```text
theme/
├── header.tsx
└── logo.tsx      → Slot 名ではないため無視（header.tsx から import する用途）
```

ディレクトリの直下のみを探索対象とし、サブディレクトリは探索しない。

`theme.extends: "./theme"` と `theme.dir: "theme"` が同じディレクトリを指す場合は、`theme.extends` を優先し、規約探索は行わない（Theme Package として扱う）。

---

## 9. Theme Package

### 9.1 パッケージ命名

公式テーマは `@natsuneko-laboratory/makit-theme-<name>` とする。サードパーティーテーマの名前に制約は設けないが、`makit-theme-` プレフィックスを推奨する。

### 9.2 exports

Theme Package は 2 つのエントリーポイントを持つ。

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.mts",
      "import": "./dist/index.mjs"
    },
    "./makit-theme": {
      "types": "./dist/manifest.d.mts",
      "import": "./dist/manifest.mjs"
    }
  }
}
```

* `"."`: Slot 名と同名の named export を提供する。`.makit/app` の Next.js ビルドが読み込む。
* `"./makit-theme"`: Manifest（§9.3）を default export する。Makit CLI が Node.js で読み込む。省略可能。

`"."` は React Server Component / Client Component を含むため、Makit CLI からは読み込まない。逆に Manifest は React に依存してはならない。

ローカルディレクトリをテーマとして指定した場合（`theme.extends: "./my-theme"`）は、`package.json` の `exports` ではなくファイル名で解決する。

* エントリー: `index.tsx` / `index.jsx` / `index.ts` / `index.js` / `index.mjs`（この順で最初に見つかったもの）
* Manifest: `makit-theme.ts` / `makit-theme.mts` / `makit-theme.js` / `makit-theme.mjs`（任意）

エントリーが存在しないディレクトリは `theme-module-not-found` エラーとする。

コンポーネントをバンドルする場合、`"use client"` ディレクティブがモジュール単位で保持されるビルド設定を用いる（`makit-runtime` は `tsdown` の `unbundle: true` を使用している）。

### 9.3 Manifest

Manifest は、テーマがビルドへ与える情報を宣言する。

```ts
// src/manifest.ts
import { defineTheme } from "@natsuneko-laboratory/makit/theme";

export default defineTheme({
  name: "@acme/makit-theme-corporate",
  styles: ["./dist/theme.css"],
  tailwindSources: ["./dist/**/*.mjs"],
  defaults: {
    accentColor: "#0b5cd5",
    radius: "none",
  },
});
```

`defineTheme` は `@natsuneko-laboratory/makit/theme` から提供する（`makit/adapter`、`makit/metadata` と同じ形式のサブパス export）。

Manifest は spec §20 のメタデータ実行制約に準じる。すなわち同期的に評価でき、シリアライズ可能な値のみを含む。

### 9.4 Manifest 型

```ts
export interface ThemeManifest {
  /** 診断メッセージに用いる表示名。 */
  name: string;
  /**
   * テーマが提供する CSS。パッケージルート基準の相対パス。
   * 生成される globals.css へ、利用者の `styles` より前に取り込む（§13.2）。
   */
  styles?: string[];
  /**
   * Tailwind のクラス走査対象。パッケージルート基準の glob。
   * 省略時はパッケージルート配下の `**\/*.{js,mjs,jsx}` を対象とする。
   */
  tailwindSources?: string[];
  /**
   * テーマが推奨するトークン既定値。
   * 利用者の `theme` 設定が優先される。
   */
  defaults?: Pick<ThemeConfig, "colorScheme" | "accentColor" | "radius" | "codeTheme">;
}
```

`defaults` の適用順は「Makit の既定値 < テーマの `defaults` < 利用者の `makit.config.ts`」とする。

Manifest が存在しない場合、`styles` は空、`tailwindSources` は既定 glob、`defaults` は空として扱う。

### 9.5 既定テーマ

既定テーマは `@natsuneko-laboratory/makit-runtime` が提供し、すべての Slot を実装する。

`theme.extends` に指定されたテーマが Slot を export していない場合、その Slot は既定テーマの実装で補完する。補完が発生した Slot は `makit build` の詳細ログに出力するが、警告としては扱わない（部分的なテーマを正当な構成として認めるため）。

---

## 10. 生成される app

### 10.1 `.makit/app/theme.js`

Slot の解決結果を、静的 import の集合として 1 つのモジュールへ生成する。

```js
// .makit/app/theme.js（生成物・編集不可）
import { pickThemeSlots, resolveThemeComponents } from "@natsuneko-laboratory/makit-runtime";
import * as baseTheme from "@acme/makit-theme-corporate";
import Slot0_Footer from "../../theme/footer.tsx";

export const themeComponents = resolveThemeComponents({
  ...pickThemeSlots(baseTheme),
  Footer: Slot0_Footer,
  PrevNextLinks: false,
});
```

`theme.extends` は名前付き import ではなく名前空間 import として取り込み、`pickThemeSlots` で Slot 名に一致する export だけを抽出する。テーマはすべての Slot を実装する義務を負わないが（§9.5）、CLI は React を読み込まずにパッケージの export を静的に列挙できないため、判定を生成コード側へ委ねる。

`resolveThemeComponents` は既定実装で欠落 Slot を補完し、`false` を「何も描画しないコンポーネント」へ変換して、完全な `ThemeComponents` を返す。

生成は `generateApp`（`packages/makit/src/core/app-generator`）の一部として行い、既存の各テンプレートと同様に `atomicWriteFile` で書き込む。内容が変わらない場合は書き込まない。

### 10.2 `layout.js` / `page.js`

生成される Next.js のエントリーは、Slot を `theme.js` 経由で参照する形へ変更する。

```js
// .makit/app/layout.js（抜粋）
import "../styles/globals.css";
import { devRefreshToken } from "./dev-refresh.js";
import { themeComponents } from "./theme.js";
import { AnalyticsScripts, getSiteData } from "@natsuneko-laboratory/makit-runtime";

const analytics = { /* 設定から埋め込み */ };

export default async function RootLayout({ children }) {
  const site = await getSiteData();
  const { RootLayout: Layout, ThemeVariables, ThemeScript } = themeComponents;
  const colorScheme = site.theme.colorScheme;

  return (
    <Layout
      site={site}
      htmlProps={{
        lang: site.lang,
        "data-theme": colorScheme !== "system" ? colorScheme : undefined,
        suppressHydrationWarning: true,
      }}
      bodyProps={{
        "data-makit-dev-refresh":
          process.env.NODE_ENV === "development" ? devRefreshToken : undefined,
      }}
      bodyStart={
        <>
          <ThemeVariables theme={site.theme} />
          {colorScheme === "system" && <ThemeScript />}
          {process.env.NODE_ENV === "production" && <AnalyticsScripts config={analytics} />}
        </>
      }
    >
      {children}
    </Layout>
  );
}
```

```js
// .makit/app/[locale]/[[...slug]]/page.js（抜粋）
const { DocsPage, PortalHomePage } = themeComponents;
// ...
return <DocsPage page={page} site={site} i18n={i18n} navigation={navigation} components={themeComponents} />;
```

`theme.js` の import 先は route の深さに応じて変わる（`app/[locale]/[[...slug]]/page.js` からは `../../theme.js`、単一ロケール構成の `app/[[...slug]]/page.js` からは `../theme.js`）。

`generateStaticParams` および `generateMetadata` はテーマの差し替え対象としない。ルーティングとメタデータは Makit Core の責務とする。

### 10.3 `RootLayout` の契約

`RootLayout` の差し替え実装は次を満たさなければならない。

1. `<html>` を 1 度だけ描画し、`htmlProps` を展開する。
2. `<body>` を 1 度だけ描画し、`bodyProps` を展開する。
3. `<body>` の内側に `bodyStart` を描画する。
4. `children` を描画する。

```tsx
import type { RootLayoutProps } from "@natsuneko-laboratory/makit-runtime";

export default function RootLayout({ htmlProps, bodyProps, bodyStart, children }: RootLayoutProps) {
  return (
    <html {...htmlProps}>
      <body {...bodyProps} className="font-sans">
        {bodyStart}
        {children}
      </body>
    </html>
  );
}
```

`bodyStart` を描画しない実装は、CSS 変数（`--makit-color-*`）とテーマ判定スクリプト、解析タグを失う。これはビルド時に検出できないため、`makit check` では検査せず、仕様上の要求として明記する。

---

## 11. Server Component / Client Component の制約

Next.js App Router の制約から、以下を規則とする。

1. **Page Slot は Server Component とする。** Page Slot は props に `components`（コンポーネント参照の集合）を受け取るため、Client Component では受け取れない。Client Component を指定した場合の挙動は Next.js のビルドエラーとなる。
2. **Part Slot は Client Component でもよい。** `ReactNode` および直列化可能な値のみを props に持つため、Client Boundary を越えられる。既定テーマの `TableOfContents`、`PageActions`、`SearchDialog`、`ThemeToggle` は Client Component である。
3. **Client Component の Slot は `async` にできない。** 非同期にデータを読む必要がある Slot は Server Component として実装する。
4. **`Sidebar` を Client Component へ差し替える場合、`components.NavigationItems` は利用できない。** Server Component の参照を Client Component の props として渡すことはできないため、差し替え実装は自前でナビゲーションを描画する。

Slot が Server / Client のどちらであるかは、差し替え実装のファイル先頭に `"use client"` があるかで決まる。Makit は Slot に `"use client"` を強制しない。

### Client Component からの import

`@natsuneko-laboratory/makit-runtime` のメインエントリーは生成データのローダー（`node:fs` に依存）も re-export する。Client Component からこのエントリーの**値**を import すると、Tree Shaking の効き方によってはローダーごと Client バンドルへ引き込まれ、`the chunking context does not support external modules (request: node:fs/promises)` でビルドが失敗する。

区分は次のとおりとする。

* **型のみの import は常に安全**。`import type { HeaderProps } from "@natsuneko-laboratory/makit-runtime"` はコンパイル時に消える。
* **既定コンポーネントの import は動作する**。関数宣言の export は Tree Shaking で分離できる。
* **定数などの値の import には `@natsuneko-laboratory/makit-runtime/client` を使う**。Client Component が必要とする値は、React に依存しないモジュールからこのサブパスへ re-export する。

```tsx
"use client";

import { THEME_STORAGE_KEY } from "@natsuneko-laboratory/makit-runtime/client";
import type { ThemeToggleProps } from "@natsuneko-laboratory/makit-runtime";
```

あわせて、`makit-runtime` の `package.json` は `"sideEffects": false` を宣言する。これがない場合、既定コンポーネントの import すら Tree Shaking されずに失敗する。

差し替えコンポーネントは、生成データのローダー（`getCollections`、`getSearchIndex` など、spec §40）を `@natsuneko-laboratory/makit-runtime` から import して利用できる。ローダーはファイルシステムを読むため、Server Component からのみ呼び出せる。

### モジュール解決

差し替えコンポーネントは利用者のプロジェクト内に置かれるため、その import は `.makit/` ではなくプロジェクト側から解決される。一方 Makit のプロジェクトは Next.js を隠蔽する方針であり（spec §5.3）、`react` や `next` を自身の依存関係に持たない。pnpm の厳格な `node_modules` 構成では makit 自身の依存もプロジェクト直下へ現れない。

このため、生成する `.makit/next.config.mjs` の `turbopack.resolveAlias` に、共有パッケージのエイリアスを書き出す。

```js
resolveAlias: {
  "react": "../node_modules/.../react",
  "react/*": "../node_modules/.../react/*",
  "react-dom": "...",
  "next": "...",
  "lucide-react": "...",
  "@natsuneko-laboratory/makit-runtime": "../node_modules/@natsuneko-laboratory/makit-runtime",
  "@natsuneko-laboratory/makit-runtime/client": ".../dist/client.mjs",
  "@natsuneko-laboratory/makit-runtime/slot-names": ".../dist/theme/slot-names.mjs",
}
```

* 対象は `react`、`react-dom`、`next`、`lucide-react`、`@natsuneko-laboratory/makit-runtime` とする。Tailwind CSS 関連は `.makit/` 内の PostCSS が読み込むものであり、利用者コードからは import されないため対象外とする。
* サブパス（`next/link`、`react/jsx-runtime` など）はワイルドカードで一括して解決する。`@natsuneko-laboratory/makit-runtime` はサブパスがパッケージ内のファイル配置と一致しないため、`client` と `slot-names` を明示的に指定する。
* エイリアスの解決先は `.makit/`（Turbopack のプロジェクトディレクトリ）からの相対パスで書き出す。Turbopack は絶対パスをプロジェクトディレクトリ基準として解釈するため、絶対パスは使えない。

この結果、利用者は差し替えコンポーネントを書くために `react` や `next` をインストールする必要がない。また、テーマパッケージと生成アプリが常に同一の React インスタンスを共有する。

型定義のみが必要な場合（`import type { HeaderProps } from "@natsuneko-laboratory/makit-runtime"`）は、プロジェクトの `tsconfig.json` から解決できる必要がある。`@natsuneko-laboratory/makit` に依存していれば、その依存として解決できる。

---

## 12. 既定コンポーネントの再利用

差し替え実装は、既定テーマのコンポーネントを部品として再利用できる。

props で受け取る `components` を使う場合、他の Slot の差し替え結果が反映される。

```tsx
import type { DocsPageProps } from "@natsuneko-laboratory/makit-runtime";

export default async function DocsPage({ page, site, navigation, components }: DocsPageProps) {
  const { Header, Sidebar, PageContent, Footer } = components;
  return (
    <div className="my-shell">
      <Header header={site.header} siteTitle={site.title} homeHref="/" />
      <Sidebar navigation={navigation} currentRoute={page.route} components={components} />
      <main>
        <PageContent html={page.html} copyButton={site.markdown.code.copyButton} />
      </main>
      <Footer footer={site.footer} />
    </div>
  );
}
```

既定実装を名前で直接 import することもできる。この場合、他の Slot の差し替えは反映されない。

```tsx
import { Header } from "@natsuneko-laboratory/makit-runtime";
```

Part Slot の差し替え実装から、同じ Slot の既定実装を import してラップできる。

```tsx
import { Footer as DefaultFooter } from "@natsuneko-laboratory/makit-runtime";
import type { FooterProps } from "@natsuneko-laboratory/makit-runtime";

export default function Footer(props: FooterProps) {
  return (
    <>
      <DefaultFooter {...props} />
      <div className="extra">Additional notice</div>
    </>
  );
}
```

---

## 13. スタイル

### 13.1 Tailwind `@source`

生成される `.makit/styles/globals.css` の `@source` に、次を追加する。

* `theme.extends` で指定したテーマのパッケージルート（Manifest の `tailwindSources`、既定は `**/*.{js,mjs,jsx}`）
* `theme.components` で指定したローカルファイルの各パス
* 規約ディレクトリ（`theme.dir`）配下の `**/*.{ts,tsx,js,jsx}`

ローカルファイルは Tailwind の自動走査対象外（`source(none)` を使用している、spec §40 の注記参照）であるため、明示的な登録が必須となる。

パッケージ由来のテーマは、`@source` にパッケージのビルド成果物のみを列挙する。`.next/` を走査対象へ含めてはならない（既存のコメントに記載された CSS 破損の原因となる）。

### 13.2 CSS の読み込み順

```text
1. Tailwind base / plugins（Makit 生成）
2. Makit の基本スタイル（.makit-prose、pre.shiki など）
3. Theme Package の styles（Manifest の `styles`）
4. 利用者の styles（`config.styles`）
```

利用者の CSS が常に最後に来ることで、テーマの見た目を CSS だけで上書きできる状態を保つ。

### 13.3 CSS 変数

既定テーマの CSS 変数（`--makit-color-*`、`--makit-radius`）は、テーマを差し替えても `ThemeVariables` が出力し続ける。差し替えテーマはこれらを利用してもよく、独自の変数体系を使ってもよい。

Makit の基本スタイル（`.makit-prose` 以下、Markdown 本文の見た目）は `--makit-color-*` に依存する。`ThemeVariables` を差し替える場合は、同名の変数を定義する責務を負う。

---

## 14. dev サーバー

* 差し替えコンポーネントは `.makit/app` のモジュールグラフに含まれるため、編集は Turbopack の HMR で反映される。生成データの再生成（spec §43）とは独立に動作する。
* `makit.config.ts` の `theme` を変更した場合、既存の設定リロード経路で `generateApp` が再実行され、`.makit/app/theme.js` が書き換わる。これはモジュールグラフの変更であるため、`next dev` の再起動を必要としない。
* 規約ディレクトリへのファイル追加・削除は、`theme.js` の再生成が必要になる。`theme.dir` をファイル監視対象へ追加し、Slot 対応ファイルの追加・削除・リネームを検知して `generateApp` を再実行する。
* 差し替えコンポーネントの構文エラーやビルドエラーは、Next.js のエラー表示に従う。Makit はこれを加工しない。

---

## 15. 検証

### 15.1 エラー

| コード | 条件 |
| --- | --- |
| `theme-module-not-found` | `theme.extends` または Component Reference のモジュールが解決できない |
| `theme-unknown-slot` | `theme.components` に未知の Slot 名がある |
| `theme-slot-not-optional` | 無効化できない Slot に `false` を指定した |
| `theme-ambiguous-slot-file` | 規約ディレクトリに同一 Slot の複数拡張子のファイルがある |
| `theme-manifest-invalid` | Manifest の default export が不正、または非同期／非シリアライズ可能 |

エラーメッセージ例:

```text
Error: Could not resolve the theme component "./theme/header.tsx" for slot "Header".
  Configured in: makit.config.ts (theme.components.Header)
  Resolved to:   /path/to/project/theme/header.tsx
```

```text
Error: "Sidebar" cannot be set to false because layout requires it.
```

named export の欠落（`{ from, export }` で指定した export が存在しない場合）は、モジュールの静的解析を CLI で行わず、Next.js のビルドエラーとして表面化させる。Makit はこの場合 `next-build-failed` を返す。

### 15.2 警告

| コード | 条件 |
| --- | --- |
| `theme-slot-file-ignored` | 規約ディレクトリに、Slot 名に対応しない拡張子付きファイルがあり、かつファイル名が既知 Slot 名に近い（レーベンシュタイン距離 1 以内） |
| `theme-outside-project` | Component Reference の相対パスがプロジェクトルート外を指す（Turbopack root の拡張が必要になり、ビルドの可搬性が下がる） |

いずれも `validation.failOn` で昇格できる（spec §46）。

`theme-slot-file-ignored` は、`heder.tsx` のような綴り誤りを黙って無視しないための警告とする。Slot 名と無関係なヘルパーファイル（§8）には出さない。

### 15.3 `makit check`

`makit check` は次を検査する。

1. `theme.extends` および全 Component Reference の解決可能性
2. Slot 名の妥当性
3. 無効化の可否
4. Manifest の妥当性

React コンポーネントとしての正しさ（props の型適合、Server / Client の整合）は検査しない。前者は利用者の `tsc`、後者は Next.js のビルドが担当する。

---

## 16. `makit init`

`makit init` に `--theme` オプションを追加し、規約ディレクトリの雛形を生成できるようにする。

```bash
makit init --theme
```

生成物:

```text
theme/
└── header.tsx
```

雛形は既定実装をラップする最小構成とし、`theme.dir` の既定値で自動的に読み込まれることをコメントで示す。

---

## 17. 既存仕様への変更

| 対象 | 変更 |
| --- | --- |
| spec §38「テーマ要件」 | 「標準テーマが提供するもの」の一覧に加え、本仕様への参照と、標準テーマが Slot 集合の既定実装であることを追記する |
| spec §49「パッケージ構成」 | `theme-default/` の位置づけを明記する（§19 の段階に従い、当面は `runtime/` が既定テーマを含む） |
| spec §51「MVP 対象外」 | 「ユーザー定義 React コンポーネント」の項目を、Slot 差し替えは対象・Markdown 要素単位の差し替えは対象外へ改める |
| `MakitConfig` の `ThemeConfig` | `extends` / `components` / `dir` を追加する |
| `ResolvedThemeConfig` | 解決済みの Slot 情報（モジュール指定子と export 名の組）を保持する |
| `MakitErrorCode` | §15.1 のコードを追加する |
| `MakitWarningCode` | §15.2 のコードを追加する |
| Turbopack root | Theme Package のパッケージルート、および差し替えファイルの所在ディレクトリを Turbopack root の算出対象へ含める |
| `turbopack.resolveAlias` | 共有パッケージのエイリアスを生成する（§11 モジュール解決） |
| `makit-runtime` の `package.json` | `"sideEffects": false` を宣言する。これがないと、Client Component の差し替えが `@natsuneko-laboratory/makit-runtime` から既定実装を import した時点で、バレル経由で `node:fs` に依存するローダーまで Client バンドルへ引きずり込まれ、ビルドが失敗する |
| `makit-runtime` の `exports` | `./slot-names`（CLI が React を読み込まずに Slot 名を参照するため）と `./client`（Client Component が安全に値を import するため、§11）を追加する |
| `makit` の `exports` | `./theme` を追加する（`defineTheme`） |

Theme Package は利用者の依存関係であり、Makit 自身の依存ではない。`.makit/node_modules` へのリンクは不要で、`.makit/app` からの通常のモジュール解決（利用者のプロジェクトの `node_modules`）で解決する。ただし Turbopack root の算出には、そのパッケージルートを含める必要がある。

---

## 18. 非目標

* Markdown 本文の要素単位のコンポーネント差し替え（MDX 相当）
* Collection ごとのテーマ（spec §51 のまま対象外）
* ブラウザ実行時のテーマ切り替え（複数テーマの同時ビルド）
* テーマのバージョン互換性の自動検査
* テーマのマーケットプレースやレジストリ
* `generateStaticParams` / `generateMetadata` の差し替え
* Next.js の `layout.js` 以外のルーティングファイルの差し替え

---

## 19. 実装計画

段階ごとに独立して価値を提供し、各段階の完了時点で公開可能な状態とする。

### Phase 1: Slot 基盤と部分差し替え

* `ThemeSlotName`、`ThemeComponents`、各 Slot Props の定義と export
* `PageHeader` の切り出し、`RootLayout` の新設
* `Page Slot` / `Sidebar` への `components` 伝播
* `resolveThemeComponents` の実装
* `theme.components` の設定・スキーマ・解決
* `.makit/app/theme.js` の生成、`layout.js` / `page.js` の書き換え
* Tailwind `@source` へのローカルファイル登録
* エラー・警告コードと `makit check`

### Phase 2: 規約ディレクトリ

* `theme.dir` の探索とファイル監視
* `theme-slot-file-ignored` 警告
* `makit init --theme`

### Phase 3: Theme Package

* `theme.extends` の解決と Slot 合成
* `defineTheme` と Manifest（`makit/theme` サブパス export）
* Manifest の `styles` / `tailwindSources` / `defaults` の適用
* Turbopack root の算出への反映
* 公式テーマパッケージの切り出し検討（`@natsuneko-laboratory/makit-theme-default`）

---

## 20. 受け入れ基準

1. `theme` を設定しない既存プロジェクトが、従来と同一の出力を生成する
2. `theme.components.Header` にローカルファイルを指定すると、生成サイトの Header がそのコンポーネントに置き換わる
3. 差し替えた Header 内の Tailwind クラスがコンパイル済み CSS に含まれる
4. `theme.components.Footer: false` で Footer が描画されない
5. 無効化できない Slot への `false` が `theme-slot-not-optional` エラーになる
6. 未知の Slot 名が `theme-unknown-slot` エラーになる
7. 解決できないモジュール指定子が `theme-module-not-found` エラーになる
8. `{ from, export }` 形式で named export を差し替えられる
9. 差し替えた `DocsPage` が `components` 経由で既定の Part Slot を再利用できる
10. 差し替えた Part Slot が `@natsuneko-laboratory/makit-runtime` から既定実装を import してラップできる
11. Client Component（`"use client"`）による Part Slot の差し替えが動作する
12. 規約ディレクトリ `theme/header.tsx` が設定なしで `Header` として認識される
13. `theme.components` と規約ディレクトリが競合した場合、`theme.components` が優先される
14. `theme.dir: false` で規約探索が無効になる
15. `theme.extends` で指定したテーマの Slot が使用され、未提供の Slot は既定実装で補完される
16. `theme.extends` と `theme.components` を併用した場合、`theme.components` が優先される
17. Manifest の `styles` が、利用者の `styles` より前に読み込まれる
18. Manifest の `defaults` が、利用者の `theme` 設定より低い優先度で適用される
19. `makit dev` で差し替えコンポーネントを編集すると HMR で反映される
20. `makit dev` で規約ディレクトリへ Slot ファイルを追加すると、再起動なしで反映される
21. `makit build` の出力が、テーマ差し替え後も Node.js ランタイムを必要としない静的ファイルである
22. `makit check` がテーマ設定の解決可能性を検査する
23. 差し替えコンポーネントが `react`（hooks）、`next/link`、`lucide-react`、および同一ディレクトリのヘルパーモジュールを、プロジェクトへ追加インストールせずに import できる
24. ヘルパーモジュール側で使った Tailwind クラスもコンパイル済み CSS に含まれる
25. 規約ディレクトリのファイル追加・削除を `makit dev` が検知して `.makit/app/theme.js` を再生成する
