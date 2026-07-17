# ファイル名プレフィックスによる並び順仕様

## 1. 概要

Makit は、Markdown ファイルおよびディレクトリ名の先頭に数値プレフィックスを付けることで、自動生成されるナビゲーションの表示順を指定できる。

例:

```text
docs/en-us/makit/
├── 01-index.md
├── 02-getting-started/
│   ├── category.makit.ts
│   ├── 01-installation.md
│   ├── 02-configuration.md
│   └── 03-first-build.md
├── 03-guides/
│   ├── 01-internationalization.md
│   └── 02-deployment.md
└── 04-reference/
    ├── 01-cli.md
    └── 02-configuration.md
```

自動生成されるサイドバー:

```text
Makit
├── Overview
├── Getting Started
│   ├── Installation
│   ├── Configuration
│   └── First Build
├── Guides
│   ├── Internationalization
│   └── Deployment
└── Reference
    ├── CLI
    └── Configuration
```

---

## 2. プレフィックス形式

標準形式は、ファイル名またはディレクトリ名の先頭に付ける10進数とハイフンとする。

```text
<number>-<name>
```

例:

```text
01-installation.md
02-configuration.md
10-advanced-usage.md
100-reference.md
```

対応する正規表現:

```regex
^([0-9]+)-(.*)$
```

数値部分の桁数は固定しない。

以下はすべて有効とする。

```text
1-overview.md
01-overview.md
001-overview.md
```

ただし、ファイル一覧上での可読性を揃えるため、2桁以上のゼロ埋めを推奨する。

---

## 3. プレフィックスの用途

数値プレフィックスは以下にのみ使用する。

* 自動ナビゲーションの並び順
* 同一カテゴリ内での前後ページ順
* ポータルやCollectionトップで自動生成される一覧順
* パンくずを構築するカテゴリ順
* 自動生成されたSectionおよびGroupの順序

以下には含めない。

* URL
* slug
* Page ID
* Collection ID
* Section ID
* Group ID
* ページタイトル
* SEOタイトル
* canonical URL
* 翻訳ページの対応付け

---

## 4. URL生成

次のファイル:

```text
docs/en-us/makit/02-getting-started/01-installation.md
```

から生成するURL:

```text
/en-us/makit/getting-started/installation/
```

次のURLにはしない。

```text
/en-us/makit/02-getting-started/01-installation/
```

ディレクトリ名とファイル名の双方から数値プレフィックスを除去する。

---

## 5. 自動Page ID

Page Metadataで `id` が指定されていない場合、自動Page IDの生成時にもプレフィックスを除去する。

入力:

```text
02-getting-started/01-installation.md
```

生成Page ID:

```text
getting-started.installation
```

次のようにはしない。

```text
02-getting-started.01-installation
```

これにより、ファイルの並び順を変更してもPage IDが変化しない。

例:

```text
01-installation.md
```

を以下へ変更しても:

```text
03-installation.md
```

Page IDは引き続き同一とする。

```text
installation
```

---

## 6. 翻訳ページの対応

異なるロケール間では、数値プレフィックスが異なっていても同一ページとして対応付けられる。

英語:

```text
docs/en-us/makit/01-getting-started.md
```

日本語:

```text
docs/ja-jp/makit/03-getting-started.md
```

プレフィックス除去後の相対パスが同じため、同じページ候補として扱う。

ただし、Page Metadataの `id` が指定されている場合は、従来どおり `id` を最優先する。

翻訳対応の優先順位:

1. Page Metadataの `id`
2. 明示された `slug`
3. 数値プレフィックスを除去した相対パス

---

## 7. 並び順の解決

自動ナビゲーションでは、以下の優先順位で並び順を決定する。

1. Page MetadataまたはCategory Metadataの `order`
2. ファイル名またはディレクトリ名の数値プレフィックス
3. ロケールに応じたタイトル順
4. プレフィックス除去後のファイル名
5. 元のファイルパス

TypeScriptメタデータの `order` は、ファイル名プレフィックスより優先する。

例:

```text
01-overview.md
02-installation.md
03-configuration.md
```

ただし、`configuration.meta.ts` に以下がある場合:

```ts
export default definePageMetadata({
  id: "configuration",
  title: "Configuration",
  order: 0,
});
```

表示順:

```text
Configuration
Overview
Installation
```

---

## 8. 数値の解釈

プレフィックスは整数として比較する。

次のファイル:

```text
2-configuration.md
10-reference.md
100-appendix.md
```

は以下の順になる。

```text
2
10
100
```

文字列順では比較しない。

そのため、次のような誤った順序にはならない。

```text
10
100
2
```

---

## 9. プレフィックスなしの項目

数値プレフィックスがないファイルやディレクトリは、プレフィックス付き項目の後に配置する。

例:

```text
01-overview.md
02-installation.md
configuration.md
reference.md
```

表示順:

```text
Overview
Installation
Configuration
Reference
```

設定により、プレフィックスなし項目を前へ配置できるようにすることも可能とする。

```ts
navigation: {
  auto: {
    unorderedPosition: "last",
  },
}
```

型:

```ts
type UnorderedPosition =
  | "first"
  | "last";
```

標準値は `last` とする。

---

## 10. 同一順序

同一の数値プレフィックスを持つ項目が存在する場合は、警告を出す。

例:

```text
01-overview.md
01-installation.md
```

警告:

```text
Warning: Duplicate navigation order 1.

  docs/en-us/makit/01-overview.md
  docs/en-us/makit/01-installation.md
```

ビルドは継続し、以下の順で安定ソートする。

1. タイトル
2. プレフィックス除去後のファイル名
3. ファイルパス

Strict Modeではエラーへ昇格可能とする。

```ts
validation: {
  failOn: [
    "duplicate-navigation-order",
  ],
}
```

---

## 11. `index.md` の扱い

以下の形式を許可する。

```text
01-index.md
```

```text
index.md
```

どちらもディレクトリのインデックスページとして扱う。

数値プレフィックス付きの `01-index.md` は、そのディレクトリ自体の並び順として使用できる。

例:

```text
docs/en-us/makit/
├── 02-getting-started/
│   └── index.md
└── 01-overview/
    └── index.md
```

表示順:

```text
Overview
Getting Started
```

ディレクトリ名とインデックスファイルの双方に順序がある場合は、ディレクトリ名を優先する。

例:

```text
02-getting-started/
└── 01-index.md
```

カテゴリの順序は `2` とする。

`01-index.md` の `1` は、同一ディレクトリ内の通常ページとしての順序には使用しない。

---

## 12. Category Metadataとの関係

`category.makit.ts` の `order` が指定されている場合、ディレクトリ名のプレフィックスより優先する。

ディレクトリ:

```text
03-deployment/
```

メタデータ:

```ts
import { defineCategory } from "makit/metadata";

export default defineCategory({
  id: "deployment",
  title: "Deployment",
  order: 1,
});
```

実効順序:

```text
1
```

ディレクトリ名の `03-` はフォールバック値として扱う。

---

## 13. Page Metadataとの関係

Page Metadataの `order` が指定されている場合、ファイル名プレフィックスより優先する。

ファイル:

```text
03-github-pages.md
```

メタデータ:

```ts
import {
  definePageMetadata,
} from "makit/metadata";

export default definePageMetadata({
  id: "deployment-github-pages",
  title: "GitHub Pages",
  order: 10,
});
```

実効順序:

```text
10
```

---

## 14. Manual Navigationとの関係

`navigation.makit.ts` による明示ナビゲーションでは、配列に記述された順番を使用する。

ファイル名プレフィックスや `order` は、明示ナビゲーションの順序を変更しない。

```ts
export default defineNavigation({
  items: [
    {
      type: "page",
      page: "configuration",
    },
    {
      type: "page",
      page: "installation",
    },
  ],
});
```

この場合の表示順:

```text
Configuration
Installation
```

元ファイルが以下であっても影響しない。

```text
01-installation.md
02-configuration.md
```

手動ナビゲーションでは、配列順が最優先となる。

---

## 15. 名前の正規化

数値プレフィックス除去後の名前を、slugや自動タイトル生成の入力に使用する。

入力:

```text
01-getting-started.md
```

正規化名:

```text
getting-started
```

自動タイトル:

```text
Getting Started
```

入力:

```text
02-api-reference/
```

正規化名:

```text
api-reference
```

自動タイトル:

```text
API Reference
```

---

## 16. プレフィックスだけの名前

以下のように、プレフィックス除去後の名前が空になるファイル名は不正とする。

```text
01-.md
02-/
```

エラー:

```text
Error: Ordered file or directory must have a name after the numeric prefix.
```

---

## 17. 負数・小数

以下は順序プレフィックスとして扱わない。

```text
-1-page.md
1.5-page.md
```

通常のファイル名として扱う。

MVPでは非負整数のみをサポートする。

---

## 18. 設定

ファイル名プレフィックスによる順序指定は標準で有効とする。

```ts
navigation: {
  auto: {
    numericPrefixes: true,
  },
}
```

型:

```ts
export interface AutoNavigationConfig {
  numericPrefixes?: boolean;

  unorderedPosition?:
    | "first"
    | "last";
}
```

標準値:

```ts
{
  numericPrefixes: true,
  unorderedPosition: "last",
}
```

無効化:

```ts
navigation: {
  auto: {
    numericPrefixes: false,
  },
}
```

無効化した場合、`01-` は通常のファイル名の一部として扱われ、URLにも含まれる。

---

## 19. 内部データモデル

ソース項目には、元の名前と正規化後の名前を保持する。

```ts
export interface SourceEntry {
  sourcePath: string;

  originalName: string;
  normalizedName: string;

  filenameOrder?: number;
  metadataOrder?: number;

  effectiveOrder?: number;
}
```

実効順序:

```ts
effectiveOrder =
  metadataOrder ??
  filenameOrder;
```

並び順の情報源も保持する。

```ts
export type OrderSource =
  | "metadata"
  | "filename"
  | "none";
```

---

## 20. ファイル名変更時の安定性

順序変更を目的として数値プレフィックスだけを変更した場合、以下は変化しない。

* Page ID
* URL
* slug
* canonical URL
* 翻訳対応
* 内部リンク
* 検索インデックス上のページ識別子

例:

```text
01-installation.md
```

から:

```text
05-installation.md
```

へ変更した場合、変化するのは自動ナビゲーション上の表示位置だけとする。

---

## 21. 内部リンク

Markdownからファイルパスを直接参照する場合は、プレフィックス付き・プレフィックスなしの双方を解決できるようにする。

推奨:

```md
[Installation](./01-installation.md)
```

またはページID参照機能がある場合:

```md
[Installation](page:installation)
```

プレフィックスなしの物理パス指定:

```md
[Installation](./installation.md)
```

については、同一ディレクトリ内で一意に解決できる場合に限り許可する。

複数候補が存在する場合はエラーとする。

```text
01-installation.md
02-installation.md
```

---

## 22. 検証

### エラー

* プレフィックス除去後の名前が空
* プレフィックス除去後に同一ルートが重複
* プレフィックス除去後に自動Page IDが重複
* 同一ディレクトリで正規化名が重複
* 数値がJavaScriptの安全な整数範囲を超える

例:

```text
01-installation.md
02-installation.md
```

両方が `installation` になるためエラーとする。

### 警告

* 同一ディレクトリ内の順序値が重複
* プレフィックスの桁数が混在
* プレフィックス付きとプレフィックスなしが混在
* 非常に大きな順序値
* `order` とファイル名プレフィックスが異なる
* Manual Navigationでプレフィックス順と配列順が異なる

桁数混在の警告例:

```text
1-overview.md
02-installation.md
003-configuration.md
```

これは動作上は有効だが、可読性のため警告可能とする。

---

## 23. 推奨運用

小規模サイト:

```text
01-overview.md
02-getting-started.md
03-configuration.md
```

階層型サイト:

```text
01-getting-started/
├── 01-installation.md
├── 02-configuration.md
└── 03-first-build.md

02-guides/
├── 01-internationalization.md
└── 02-deployment.md

03-reference/
├── 01-cli.md
└── 02-config-file.md
```

途中へのページ追加を考慮し、10刻みにする運用も許可する。

```text
10-overview.md
20-installation.md
30-configuration.md
```

途中追加:

```text
25-environment-variables.md
```

---

## 24. 既存仕様への変更

自動ナビゲーションの並び順を以下へ変更する。

従来:

```text
1. Page MetadataまたはCategory Metadataのorder
2. タイトル順
3. ファイル名
```

更新後:

```text
1. Page MetadataまたはCategory Metadataのorder
2. ファイル名またはディレクトリ名の数値プレフィックス
3. タイトル順
4. プレフィックス除去後のファイル名
5. 元のファイルパス
```

また、以下の生成処理では数値プレフィックスを除去する。

* URL
* 自動slug
* 自動Page ID
* 自動Collection ID
* 自動Category ID
* 自動タイトル
* 翻訳対応用相対パス

---

## 25. 受け入れ基準

1. `01-`, `02-` などのプレフィックスでサイドバー順を指定できる
2. 数値を整数として比較できる
3. 桁数が異なっても正しく並べられる
4. プレフィックスをURLへ含めない
5. プレフィックスを自動Page IDへ含めない
6. プレフィックスだけを変更してもURLが変わらない
7. プレフィックスだけを変更してもPage IDが変わらない
8. ディレクトリのプレフィックスでSection順を指定できる
9. `order` がプレフィックスより優先される
10. Manual Navigationでは配列順が優先される
11. プレフィックスなしの項目を最後へ配置できる
12. 同一順序値を警告できる
13. 正規化後の名前重複をエラーにできる
14. 異なるロケールでプレフィックスが異なっても翻訳を対応付けられる
15. `index.md` と `01-index.md` の双方をインデックスとして扱える
16. `makit check` でプレフィックス関連の不整合を検出できる
