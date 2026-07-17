# メタデータ API

Markdown と同じ場所に TypeScript ファイルを置くと、ページやナビゲーションの情報を型安全に定義できます。

## ページメタデータ

```ts
import { definePageMetadata } from "@natsuneko-laboratory/makit/metadata";

export default definePageMetadata({
  id: "guides.configuration",
  title: "設定",
  description: "サイト全体の設定方法。",
  order: 1,
});
```

主なプロパティは次のとおりです。

- `id`: 翻訳やリンクで使う安定した識別子
- `title`: ナビゲーションやページ見出しに使うタイトル
- `description`: SEO や概要表示に使う説明
- `slug`: URL の名前を明示的に指定する値
- `order`: 同じ階層での表示順。ファイル名プレフィックスより優先されます

## Collection

```ts
import { defineCollection } from "@natsuneko-laboratory/makit/metadata";

export default defineCollection({
  id: "makit",
  title: "Makit",
  description: "Makit のドキュメント",
  path: "/makit",
});
```

## 自動と手動

特別な設定がなければ、Makit はファイル構造からナビゲーションを自動生成します。大きなサイトで表示順を細かく制御したい場合は、`navigation.makit.ts` と `defineNavigation` を使って明示的に定義できます。
