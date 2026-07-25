# 基本コンセプト

Makit は、Markdown ファイルを中心に、必要なところだけ TypeScript のメタデータを足していく仕組みです。

## Markdown は本文を書く場所

見出し、段落、リスト、コードブロックなど、読者に見せる文章は Markdown に書きます。
ページを増やすだけなら、`.md` ファイルを作るだけで構いません。

```markdown
# Configuration

Makit の設定は `makit.config.ts` に書きます。
```

## TypeScript は構造を定義する場所

ページタイトルや ID を明示したいときは、隣に `{ページ名}.meta.ts` を置きます。

```ts
import { definePageMetadata } from "@natsuneko-laboratory/makit/metadata";

export default definePageMetadata({
  id: "configuration",
  title: "設定",
});
```

TypeScript にすることで、エディター補完や型検査を利用できます。YAML の構造ファイルを別に管理する必要はありません。

## コードブロックの補足表示

`makit.config.ts` の `markdown.code.lineNumbers` を有効にすると、すべてのコードブロックに行番号を表示できます。特定のブロックだけに表示する場合は、ファイル名の後ろに `lineNumbers` を書きます。

全体設定は次のように書きます。

```ts
markdown: {
  code: {
    lineNumbers: true,
  },
},
```

````markdown
```typescript src/config.ts lineNumbers
export const enabled = true;
```
````

行の末尾に注釈を書くと、その行を強調したり Git の差分のように表示できます。注釈自体は表示されません。

````markdown
```typescript
const changed = true; // [!code highlight]
const added = true; // [!code ++]
const removed = false; // [!code --]
```
````

`markdown`、`md`、`mdx` のコードフェンス内では、注釈文字列は Markdown のサンプルとしてそのまま表示されます。

````markdown
```markdown
const value = true; // [!code highlight]
```
````

## GitHub 形式のアラート

重要な内容を目立たせるには、GitHub 形式のアラート記法を使えます。`NOTE`、`TIP`、`IMPORTANT`、`WARNING`、`CAUTION` に対応しており、種別ごとに見分けやすい表示になります。

```markdown
> [!IMPORTANT]
> このアドオンを導入・使用する前に、[セキュリティガイド](/security-guides)を一読してください。
```

## サイトの階層

サイトは次のような階層で考えます。

```text
Site
└── Collection
    └── Section
        └── Group
            └── Page
```

すべての階層を使う必要はありません。小さなサイトなら、サイト直下にページを置くだけでも動きます。

## URL とサイドバーは別々に考える

ファイル名の `01-` や `02-` は、主に表示順を決めるためのものです。URL には含まれません。

```text
docs/02-guides/01-installation.md
```

このファイルの URL は、次のようになります。

```text
/guides/installation/
```

順番を変えても URL やページ ID が変わらないので、サイトを整理しやすくなります。

`(marketing)` のように括弧で囲んだディレクトリは、さらに踏み込んで URL からまるごと除外されます。既定では、サイドバー上には独立したセクションとして残ります。

```text
docs/(marketing)/about.md
```

```text
/about/
```

サイドバー上のグループ化も外したい場合は、[コンテンツの整理](./03-guides/02-content-structure.md)を参照してください。

## 解決は Makit、描画はテーマ

Makit はコンテンツをページデータ（タイトル、HTML、ナビゲーションツリー、パンくず）へ解決し、それを描画する React コンポーネント群へ渡します。この一式が Makit の組み込みテーマです。

各コンポーネントは名前の付いた差し替え単位になっているため、ヘッダーだけ、あるいはページ全体のシェルを、コンテンツや設定の構造に触れずに置き換えられます。

```text
theme/header.tsx     → Header コンポーネントを差し替える
theme/docs-page.tsx  → ページ全体のシェルを差し替える
```

解決と描画は分かれたままです。どのコンポーネントが描画しても、ルーティング、ナビゲーション、検証の挙動は変わらず、出力は完全な静的ファイルのままです。詳細は[テーマのカスタマイズ](./03-guides/06-theming.md)を参照してください。
