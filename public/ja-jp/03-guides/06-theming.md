# テーマのカスタマイズ

`makit.config.ts` の `theme` は、トークンの調整から組み込みコンポーネントの全面差し替えまで、3 段階のカスタマイズを扱います。

| 段階                   | 手段                                                                | 主な用途                                               |
| ---------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| トークン               | `theme.colorScheme`、`accentColor`、`radius`、`codeTheme`、`styles` | 色、角丸、追加 CSS                                     |
| コンポーネント差し替え | `theme/` ディレクトリ、または `theme.components`                    | ヘッダーの変更、フッターへの追加、独自サイドバー       |
| テーマ全体             | `theme.extends`                                                     | 既存デザインシステムへの統合、まったく異なるレイアウト |

段階は組み合わせられます。テーマパッケージを土台にしつつ、その一部のコンポーネントだけを差し替えられます。どの段階でも出力は完全な静的ファイルのままで、配信に Node.js ランタイムは不要です。

## コンポーネントを 1 つ差し替える

`theme/header.tsx` を作成します。ファイル名はコンポーネント名のケバブケースで、設定なしで認識されます。

```tsx
// theme/header.tsx
import { Header as DefaultHeader } from "@natsuneko-laboratory/makit-runtime";
import type { HeaderProps } from "@natsuneko-laboratory/makit-runtime";

export default function Header(props: HeaderProps) {
  return (
    <>
      <div className="bg-amber-100 px-4 py-2 text-sm">v2 のドキュメントはベータ版です。</div>
      <DefaultHeader {...props} />
    </>
  );
}
```

`react` や `next` をプロジェクトへ追加する必要はありません。Makit が解決します（[コンポーネントから使える import](#コンポーネントから使える-import)）。

`makit init --theme` はこのファイルの雛形を生成します。

### コンポーネント名

各コンポーネント名は 1 つのファイル名に対応します。`theme/<file>.tsx` を置くと差し替わります。

| コンポーネント       | ファイル                  | 差し替える対象                                  |
| -------------------- | ------------------------- | ----------------------------------------------- |
| `RootLayout`         | `root-layout.tsx`         | `<html>` と `<body>`（フォント、body のクラス） |
| `DocsPage`           | `docs-page.tsx`           | 通常ページ全体のシェル                          |
| `PortalHomePage`     | `portal-home-page.tsx`    | Portal レイアウトのトップページ                 |
| `RootPage`           | `root-page.tsx`           | `/` のロケール判定・選択ページ                  |
| `NotFoundPage`       | `not-found-page.tsx`      | 404 ページ                                      |
| `Header`             | `header.tsx`              | サイトヘッダー                                  |
| `Footer`             | `footer.tsx`              | サイトフッター                                  |
| `Sidebar`            | `sidebar.tsx`             | ナビゲーションのサイドバー                      |
| `NavigationItems`    | `navigation-items.tsx`    | サイドバー内のナビゲーションツリー              |
| `Breadcrumbs`        | `breadcrumbs.tsx`         | パンくずリスト                                  |
| `PageHeader`         | `page-header.tsx`         | ページの `<h1>` と説明文                        |
| `PageContent`        | `page-content.tsx`        | 変換済み Markdown 本文                          |
| `PrevNextLinks`      | `prev-next-links.tsx`     | 前後ページのリンク                              |
| `TableOfContents`    | `table-of-contents.tsx`   | ページ内目次                                    |
| `PageActions`        | `page-actions.tsx`        | 編集・Markdown コピーの操作                     |
| `SearchDialog`       | `search-dialog.tsx`       | 検索ダイアログ                                  |
| `CollectionSwitcher` | `collection-switcher.tsx` | Collection の切り替え                           |
| `LocaleSwitcher`     | `locale-switcher.tsx`     | 言語切り替え                                    |
| `ThemeToggle`        | `theme-toggle.tsx`        | ライト・ダークの切り替え                        |
| `FallbackNotice`     | `fallback-notice.tsx`     | 未翻訳ページの通知                              |
| `ThemeVariables`     | `theme-variables.tsx`     | `--makit-color-*` の CSS 変数                   |
| `ThemeScript`        | `theme-script.tsx`        | ハイドレーション前のテーマ判定スクリプト        |

拡張子は `.tsx`、`.jsx`、`.ts`、`.js` が使えます。上の一覧にない名前のファイルは無視されるため、ヘルパーモジュールを同じディレクトリに置けます。

```text
theme/
├── header.tsx   → Header コンポーネント
└── logo.tsx     → header.tsx が import するだけのモジュール
```

ディレクトリ名は `theme.dir` で変更でき、`theme.dir: false` で規約自体を無効化できます。

### 設定で明示的に指定する

`theme.components` はファイル名の規約に頼らず同じことを行い、`theme/` よりも優先されます。

```ts
theme: {
  components: {
    // プロジェクト内のファイルの default export
    Header: "./src/ui/docs-header.tsx",
    // ファイルまたはパッケージの named export
    Footer: { from: "@acme/ui", export: "DocsFooter" },
    // 描画しない
    PrevNextLinks: false,
  },
},
```

コンポーネントはモジュールのパスで指定します。設定ファイルへ import して渡すことはできません。`makit.config.ts` は Makit CLI が評価し、コンポーネントは生成されるサイト側でビルドされるため、両者は値を受け渡せません。

`false` を指定できるのは `Footer`、`Sidebar`、`Breadcrumbs`、`PageHeader`、`PrevNextLinks`、`TableOfContents`、`PageActions`、`SearchDialog`、`CollectionSwitcher`、`LocaleSwitcher`、`ThemeToggle`、`FallbackNotice`、`ThemeScript` です。それ以外はレイアウトの構造上必要なため、無効化はビルドエラーになります。

## 組み込みコンポーネントを再利用する

既定のコンポーネントはすべて `@natsuneko-laboratory/makit-runtime` から export されているため、一から書き直さずにラップできます。

ページ単位のコンポーネントは、解決済みのコンポーネント一覧を `components` prop で受け取ります。この一覧は他の差し替えも反映しているため、ページのシェルだけを差し替えて中の部品は標準のものを使う、という書き方ができます。

```tsx
// theme/docs-page.tsx
import type { DocsPageProps } from "@natsuneko-laboratory/makit-runtime";

export default async function DocsPage({ page, site, navigation, components }: DocsPageProps) {
  const { Header, Sidebar, PageContent, Footer } = components;

  return (
    <div className="flex min-h-screen flex-col">
      <Header header={site.header} siteTitle={site.title} homeHref={`${site.basePath}/`} />
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <Sidebar navigation={navigation} currentRoute={page.route} components={components} />
        <main className="min-w-0 flex-1 px-8 py-12">
          <h1>{page.title}</h1>
          <PageContent html={page.html} copyButton={site.markdown.code.copyButton} />
        </main>
      </div>
      <Footer footer={site.footer} />
    </div>
  );
}
```

## Server Component と Client Component

コンポーネントは既定でサーバー側で描画されます。これが静的出力を保っている仕組みです。hooks やイベントハンドラーが必要な場合は `"use client"` を付けます。

```tsx
// theme/theme-toggle.tsx
"use client";

import { useState } from "react";
import type { ThemeToggleProps } from "@natsuneko-laboratory/makit-runtime";

export default function ThemeToggle(_props: ThemeToggleProps) {
  const [theme, setTheme] = useState("light");
  // ...
}
```

React Server Components の仕組みから、次の 2 つの制約があります。

- ページ単位の 5 つ（`RootLayout`、`DocsPage`、`PortalHomePage`、`RootPage`、`NotFoundPage`）は Server Component でなければなりません。`components` をコンポーネント参照として受け取るためです。
- Client Component は `async` にできません。生成データを読む必要があるものは Server Component として実装します。

### Client Component の中での import

`@natsuneko-laboratory/makit-runtime` は、ファイルシステムを読む生成データのローダーも export しています。`"use client"` のモジュールでは次のように使い分けます。

- 型だけの import は常に安全です。コンパイル時に消えます。
- 既定コンポーネントをラップするための import は動作します。
- 定数などの値は `@natsuneko-laboratory/makit-runtime/client` から import します。このエントリーポイントは React に依存しないため、サーバー専用のコードが Client バンドルへ入り込みません。

```tsx
"use client";

// 組み込みのハイドレーション前スクリプトが読むキー。独自のトグルでも
// リロード後の状態を一致させられます。
import { THEME_STORAGE_KEY } from "@natsuneko-laboratory/makit-runtime/client";
import type { ThemeToggleProps } from "@natsuneko-laboratory/makit-runtime";
```

`the chunking context does not support external modules (request: node:fs/promises)` が出た場合は、Client Component がメインエントリーから値を import しています。その import を `/client` へ移してください。

## コンポーネントから使える import

差し替えコンポーネントはプロジェクト内に置きますが、生成されるサイトの一部としてビルドされます。次のパッケージは、Makit が使っているものと同じ実体へ解決されます。

- `react`、`react-dom`（`react/jsx-runtime` などのサブパスを含む）
- `next`（`next/link`、`next/navigation`、`next/image`、`next/script` など）
- `lucide-react`
- `@natsuneko-laboratory/makit-runtime` とその `/client` エントリーポイント

そのため、プロジェクトが Next.js に依存していなくても `import Link from "next/link"` と書けます。自分のモジュールへの相対 import も通常どおり使えます。

型は別の話です。エディタで `HeaderProps` などを解決させるには、`@natsuneko-laboratory/makit-runtime` と `@types/react` を `devDependencies` へ追加してください。どちらもビルドには不要です。

Server Component からは、ランタイムが export しているローダー（`getCollections`、`getGlobalNavigation`、`getSearchIndex` など）で生成データを読めます。

## スタイル

差し替えコンポーネントで使った Tailwind のクラスは自動的にコンパイルされます。Makit が `theme/` と `theme.components` に指定されたファイルを Tailwind の走査対象として登録するためです。同じディレクトリのヘルパーモジュールも対象です。

`styles` に指定した CSS は常に最後に読み込まれるため、テーマの見た目を CSS だけで上書きできます。`--makit-color-*` と `--makit-radius` の変数は、`ThemeVariables` 自体を差し替えない限り利用できます（Markdown 本文のスタイルはこれらの変数に依存しています）。

Markdown 本文は HTML 文字列としてコンポーネントへ渡されるため、要素単位のコンポーネント差し替えはできません。見出し、表、コードブロックの見た目は `styles` の CSS で調整します。

## テーマパッケージを使う

`theme.extends` は組み込みテーマ全体を置き換えます。npm パッケージでも、プロジェクト内のディレクトリでも指定できます。

```ts
theme: {
  extends: "@acme/makit-theme-corporate",
  // コンポーネント単位の差し替えも併用できる
  components: {
    Footer: "./theme/footer.tsx",
  },
},
```

テーマはすべてのコンポーネントを実装する必要はなく、提供していないものは組み込みの実装が使われます。作り方は[テーマパッケージリファレンス](../04-reference/05-theme-packages.md)を参照してください。

### 公式テーマ

Makit と同時に 4 つのテーマを公開しています。

| パッケージ                                    | 見た目                                                                         | プレビューサイト                       |
| --------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------- |
| `@natsuneko-laboratory/makit-theme-terminal`  | 等幅・角丸なし・蛍光色のアクセント。CLI やインフラのドキュメント向け           | https://terminal.makit.natsuneko.com/  |
| `@natsuneko-laboratory/makit-theme-product`   | 柔らかいカードとピル型ナビ、グラデーションのトップページ。製品ドキュメント向け | https://product.makit.natsuneko.com/   |
| `@natsuneko-laboratory/makit-theme-editorial` | セリフ体と温かみのある紙色、細い罫線。ハンドブックや長文ガイド向け             | https://editorial.makit.natsuneko.com/ |
| `@natsuneko-laboratory/makit-theme-brutalist` | 太い罫線とオフセットシャドウ、シグナルカラー。OSS や制作ツールの文書向け       | https://brutalist.makit.natsuneko.com/ |

```bash
pnpm add @natsuneko-laboratory/makit-theme-terminal
```

```ts
theme: {
  extends: "@natsuneko-laboratory/makit-theme-terminal",
},
```

いずれも manifest を持つため、アクセントカラーや角丸は設定に書き直さなくても適用されます。`makit.config.ts` で指定した値は常にそちらが優先されます。動くサイトは [`examples/theme-terminal`](https://github.com/mika-f/makit/tree/main/examples/theme-terminal)、[`examples/theme-product`](https://github.com/mika-f/makit/tree/main/examples/theme-product)、[`examples/theme-editorial`](https://github.com/mika-f/makit/tree/main/examples/theme-editorial)、[`examples/theme-brutalist`](https://github.com/mika-f/makit/tree/main/examples/theme-brutalist) にあります。

## 開発中の挙動

`makit dev` では、差し替えコンポーネントの編集は他のソースと同じように即座に反映されます。`theme/` へのファイル追加、削除、リネームは設定の再読み込みとして扱われ、再起動は不要です。

`makit check` は、すべてのコンポーネント指定が解決できるかを検査します。React コンポーネントとして正しいかどうかは、プロジェクトの `tsc` とビルドが報告します。

よくあるエラー:

| コード                      | 対処                                                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `theme-module-not-found`    | `theme.components` / `theme.extends` のパスまたはパッケージが存在しません。パスはプロジェクトルート基準で、拡張子が必要です。 |
| `theme-unknown-slot`        | `theme.components` のキーがコンポーネント名ではありません。メッセージが最も近い名前を提示します。                             |
| `theme-slot-not-optional`   | 構造上必要なコンポーネントに `false` を指定しています。                                                                       |
| `theme-ambiguous-slot-file` | `theme/` 内で同じコンポーネントに 2 つのファイル（`header.tsx` と `header.ts` など）が対応しています。                        |
| `theme-slot-file-ignored`   | `theme/` 内のファイル名がコンポーネント名の綴り誤りに見えるため無視されています（警告）。                                     |

## 動く例

リポジトリの [`examples/theme`](https://github.com/mika-f/makit/tree/main/examples/theme) は、`Header`、`PageHeader`、`ThemeToggle`（Client Component）、`Footer` を差し替え、`PrevNextLinks` を無効化し、それ以外は組み込みのまま使うサイトです。
