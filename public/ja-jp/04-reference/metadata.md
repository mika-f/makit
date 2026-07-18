# メタデータ API

Markdown と同じ場所に TypeScript ファイルを置くと、ページやナビゲーションの情報を型安全に定義できます。

## ページメタデータ

```ts
import { definePageMetadata } from "@natsuneko-laboratory/makit/metadata";

export default definePageMetadata({
  id: "guides.configuration",
  title: "設定",
  description: "サイト全体の設定方法。",
  slug: "config",
  order: 1,
  image: "/og/config.png",
});
```

Markdown と同名の `configuration.meta.ts` のようなファイルを置きます。メタデータを省略すると、最初の H1 とファイル名から値が推測されます。

| 項目                          | 説明                                                                                               |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `id`                          | 翻訳、手動ナビゲーション、リンクで使う安定した識別子。同じ locale・Collection 内で重複できません。 |
| `title` / `description`       | ナビゲーション、HTML タイトル、概要の表示に使います。                                              |
| `slug`                        | URL の最後の名前を上書きします。文字列は 1 セグメント、文字列配列は複数セグメントです。            |
| `order`                       | 自動ナビゲーションの順序。小さい値ほど先で、ファイル名の数値プレフィックスより優先します。         |
| `draft`                       | 開発サーバーでは表示しますが、本番ビルドから除外します。                                           |
| `hidden`                      | ページは生成しますが、ナビゲーションには表示しません。                                             |
| `sidebar` / `tableOfContents` | そのページでサイドバー／目次を表示するか。既定はどちらも `true`。                                  |
| `layout`                      | 利用するレイアウト名。                                                                             |
| `canonical` / `image`         | canonical URL とページ固有の OG 画像。                                                             |

簡単な上書きには Markdown 先頭の YAML front matter も使えます。ただし、ネストした値や `.meta.ts` との併用はできません。型安全性と複雑な設定が必要な場合は `.meta.ts` を使います。

## Collection

```ts
import { defineCollection } from "@natsuneko-laboratory/makit/metadata";

export default defineCollection({
  id: "makit",
  title: "Makit",
  description: "Makit のドキュメント",
  path: "/makit",
  icon: "/makit.svg",
  seo: { image: "/og/makit.png" },
});
```

Collection は `collection.makit.ts` に置きます。`id` は locale をまたいで同じ製品を対応付けるための識別子です。`path` は URL 接頭辞、`index` は Collection のトップ Markdown（既定 `index.md`）、`hidden` は portal と切替 UI からの非表示を指定します。`title` と `description` は locale ごとの文字列オブジェクトにもできます。

## カテゴリ

ディレクトリに `category.makit.ts` を置くと、自動ナビゲーションのセクションまたはグループを調整できます。

```ts
import { defineCategory } from "@natsuneko-laboratory/makit/metadata";

export default defineCategory({
  title: "ガイド",
  type: "section",
  order: 2,
  collapsible: true,
  index: "index.md",
});
```

`type` は既定で `section`、`order` は並び順、`hidden` はサブツリーの非表示、`collapsible` と `collapsed` は折りたたみ動作を制御します。`index` を指定すると、そのカテゴリをクリック可能にできます。

## 手動ナビゲーション

特別な設定がなければ、Makit はファイル構造からナビゲーションを自動生成します。大きなサイトで表示順を細かく制御したい場合は、Collection のルートに `navigation.makit.ts` を置きます。

```ts
import { defineNavigation } from "@natsuneko-laboratory/makit/metadata";

export default defineNavigation({
  items: [
    { type: "page", page: "getting-started" },
    {
      type: "section",
      title: "ガイド",
      collapsible: true,
      items: [
        { type: "page", page: "guides.configuration" },
        { type: "link", title: "GitHub", href: "https://github.com/mika-f/makit", external: true },
      ],
    },
  ],
});
```

ノードは、ページ ID を参照する `page`、子要素を持つ `section`／`group`、任意 URL の `link`、別 Collection のトップを開く `collection` を使えます。`page` には `title` の上書きと `hidden`、`section`／`group` には `id`、`collapsible`、`collapsed` を指定できます。
