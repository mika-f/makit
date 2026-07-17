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
