# コンテンツの整理

ページが増えてきたら、ディレクトリとファイル名で読みやすい順序を作ります。

## おすすめの構成

```text
docs/
├── index.md
├── 01-getting-started/
│   ├── 01-installation.md
│   └── 02-configuration.md
├── 02-guides/
│   ├── 01-internationalization.md
│   └── 02-deployment.md
└── 03-reference/
    └── cli.md
```

数字のプレフィックスはサイドバーの順番だけに使われ、URL からは取り除かれます。
プレフィックスがないファイルは、既定では同じ階層の最後に並びます。

## 仮想グループ（Route Group）

ディレクトリ名を `(` `)` で囲むと、URL にセグメントを追加せずにファイルを整理できます。Next.js の Route Group と同じ仕組みです。

```text
docs/
├── index.md
├── (marketing)/
│   ├── about.md
│   └── pricing.md
└── (product)/
    └── overview.md
```

`docs/(marketing)/about.md` は `/marketing/about/` ではなく `/about/` になります。既定（`navigation.auto.routeGroups: "url"`）では、`(marketing)` と `(product)` はサイドバー上でそれぞれ独立したセクションとして残ります。`routeGroups: "flatten"` を指定すると、そのグループ化も外れて子ページが親の階層へ直接繰り上がります。`false` にすると Route Group 自体を無効化し、`(name)` を通常のディレクトリ名として扱います。

## ページのタイトルを制御する

Markdown の先頭見出しは、そのままページタイトルになります。検索結果やナビゲーション用に別のタイトルを指定したい場合はメタデータを追加します。

```ts
import { definePageMetadata } from "@natsuneko-laboratory/makit/metadata";

export default definePageMetadata({
  id: "installation",
  title: "インストール",
  description: "Makit をプロジェクトへ追加する方法。",
});
```

## 簡易的な front matter を使う

タイトル、説明、表示順のような単純な値だけを指定したい場合は、Markdown の先頭に YAML front matter を書けます。小さなページで `.meta.ts` を増やしたくないときに便利です。

```markdown
---
title: インストール
description: Makit をプロジェクトへ追加する方法。
order: 1
---

# Makit をインストールする

Node.js 20 以降が必要です。
```

front matter では、`id`、`title`、`description`、`slug`、`order`、`draft`、`hidden`、`sidebar`、`tableOfContents`、`layout`、`canonical`、`image`、`noindex`、`nofollow` のようなページ単位のフラットな値を指定できます。`slug` だけは URL の複数セグメントを表す文字列配列も指定できます。

ネストした設定やオブジェクトの配列は front matter では扱えません。未知のキーは無視され、型に合わない値やネストした値は警告して除外されます。また、同じページに non-empty の front matter と `.meta.ts` を併用することもできません。複雑な設定、型検査、再利用する値が必要な場合は `.meta.ts` を選んでください。`validation.disallowFrontMatter: true` を設定すると、front matter を禁止してメタデータファイルへ統一できます。

## Collection を使うタイミング

複数の製品やサービスを同じポータルで扱う場合は Collection を使います。Collection ごとにトップページ、URL の接頭辞、ナビゲーションを持てます。

```text
docs/
├── makit/
│   ├── collection.makit.ts
│   └── index.md
└── enduroq/
    ├── collection.makit.ts
    └── index.md
```

最初から Collection を導入する必要はありません。サイトが大きくなった段階で移行できます。
