# Route Group（仮想グループ）仕様

## 1. 概要

Makit は、Next.js の Route Group と同様、`(` `)` で囲んだディレクトリ名を Route Group として扱う。Route Group は URL パスに一切現れないが、ファイルシステム上のディレクトリとしては存在し続け、自動ナビゲーション上ではその他のディレクトリと同様に Section / Group を構成する。

例:

```text
docs/en-us/makit/
├── index.md
├── (marketing)/
│   ├── category.makit.ts
│   ├── about.md
│   └── pricing.md
└── (product)/
    ├── category.makit.ts
    └── overview.md
```

生成される URL:

```text
/en-us/makit/
/en-us/makit/about/
/en-us/makit/pricing/
/en-us/makit/overview/
```

自動生成されるサイドバー:

```text
Makit
├── Overview
├── Marketing
│   ├── About
│   └── Pricing
└── Product
    └── Overview
```

Route Group はディレクトリ名を URL から除外するだけであり、`(marketing)` と `(product)` はナビゲーション上で別々の Section として残る。

---

## 2. 構文

ディレクトリ名全体を `(` と `)` で囲む。

```text
(<name>)
```

対応する正規表現:

```regex
^\((.*)\)$
```

Route Group はディレクトリ名にのみ適用され、ファイル名（Markdown ファイル自身の名前）には適用しない。次のファイルは Route Group として扱わない。

```text
guides/(configuration).md
```

これは通常のファイル名 `(configuration)` として扱う。

数値プレフィックス（ORDER-PREFIX §2）と組み合わせられる。プレフィックスを先に除去してから括弧を判定する。

```text
01-(marketing)/
```

は、並び順 `1` を持つ Route Group `marketing` として扱う。

---

## 3. URL 生成への影響

Route Group ディレクトリの名前は、URL セグメントとして一切生成しない。

次のファイル:

```text
docs/en-us/makit/(marketing)/about.md
```

から生成する URL:

```text
/en-us/makit/about/
```

次の URL にはしない。

```text
/en-us/makit/marketing/about/
```

Route Group の `index.md` は、親ディレクトリのインデックスページとして扱う。

```text
docs/en-us/makit/(marketing)/index.md
```

生成 URL:

```text
/en-us/makit/
```

Collection のトップページや `home.layout` の自動判定など、「そのページが Collection のルートかどうか」を判定するすべての処理は URL（生成後のセグメント）を基準にする。Route Group の有無でこれらの判定結果が変わることはない。

---

## 4. ナビゲーションおよびファイルシステムへの影響（`routeGroups: "url"`、既定値）

既定の `"url"` モードでは、Route Group は URL からは消えるが、以下には引き続き現れる。

* 自動ナビゲーションのツリー構造（Section / Group ノード）
* `category.makit.ts` によるディレクトリ単位のメタデータ上書き（`(marketing)/category.makit.ts` はそのまま `(marketing)` ディレクトリに紐づく）
* パンくずの階層（Route Group ノード自体は `href` を持たない場合がある通常のコンテナノードとして扱う）
* 自動 Page ID（`(marketing)/about.md` の自動 Page ID は `marketing.about`）

括弧を除いた名前が、自動タイトルおよびナビゲーションの表示名の入力になる。

```text
(marketing)/
```

自動タイトル:

```text
Marketing
```

## 4.1 完全非表示モード（`routeGroups: "flatten"`）

`"flatten"` モードでは、Route Group は URL からだけでなく自動ナビゲーションのツリーからも消える。ディレクトリの存在はファイルシステム上にのみ残り、その子要素は親ディレクトリの階層へ直接繰り上げる。

```text
docs/en-us/makit/
├── index.md
└── guides/
    ├── (internal)/
    │   └── setup.md
    └── deployment.md
```

`routeGroups: "url"`（既定）の場合のサイドバー:

```text
Makit
├── Overview
└── Guides
    ├── Internal
    │   └── Setup
    └── Deployment
```

`routeGroups: "flatten"` の場合のサイドバー:

```text
Makit
├── Overview
└── Guides
    ├── Setup
    └── Deployment
```

`(internal)` はコンテナノードを作らず、`setup.md` は `Guides` の直下に並ぶ。

`(marketing)/category.makit.ts` のように、`"flatten"` モードで消えるディレクトリの内側に `category.makit.ts` を置いても、紐付け先のナビゲーションノードが存在しないため無効とする。ビルドは継続し、`route-group-category-ignored` 警告を出す（`validation.failOn` で昇格可能）。

---

## 5. Markdown からの内部リンク

Markdown 内の相対リンクを解決する際も、Route Group ディレクトリを URL から除外する。

```md
[About](./(marketing)/about.md)
```

生成される href:

```text
/about/
```

---

## 6. 兄弟ディレクトリの衝突

Route Group を挟んでいても、生成される URL が重複する場合は通常どおりビルドエラーとする（spec §15.3）。

```text
(marketing)/index.md
(product)/index.md
```

両方とも `/` に解決するため、`duplicate-route` エラーとする。

Route Group の除去後にディレクトリ名が衝突する場合（例えば `(foo)` と `foo` が同じ階層に存在する場合）も、ORDER-PREFIX §22 と同様にビルドエラーとする。

---

## 7. Category Metadata との関係

`category.makit.ts` は Route Group ディレクトリの内側にそのまま配置できる。

```text
(marketing)/
├── category.makit.ts
├── about.md
└── pricing.md
```

```ts
import { defineCategory } from "makit/metadata";

export default defineCategory({
  title: "Marketing",
  order: 1,
});
```

このメタデータは、URL には現れない `(marketing)` ディレクトリが持つナビゲーションノードにそのまま適用する。

---

## 8. 空の名前

括弧の中身が空になる名前は不正とする。

```text
()
```

エラー:

```text
Error: "()" is a route group but has no name inside the parentheses.
```

---

## 9. 設定

`routeGroups` は 3 値を取る。

```ts
export type RouteGroupsMode =
  | boolean
  | "url"
  | "flatten";

export interface AutoNavigationConfig {
  numericPrefixes?: boolean;
  routeGroups?: RouteGroupsMode;
  unorderedPosition?: "first" | "last";
}
```

* `"url"`（既定。`true` はこのエイリアス）: §4 のとおり、URL のみ透過する。ナビゲーション上は Section / Group を構成する。
* `"flatten"`: §4.1 のとおり、URL に加えナビゲーションのコンテナも作らない。子要素は親の階層へ直接繰り上げる。
* `false`: Route Group の解釈自体を無効化する。`(marketing)` は通常のディレクトリ名の一部として扱われ、URL にも `(marketing)` がそのまま含まれる。

標準値:

```ts
{
  numericPrefixes: true,
  routeGroups: "url",
  unorderedPosition: "last",
}
```

設定例:

```ts
navigation: {
  auto: {
    routeGroups: "flatten",
  },
}
```

---

## 10. 受け入れ基準

1. `(name)` ディレクトリの名前を URL へ含めない
2. `routeGroups: "url"`（既定）では `(name)` ディレクトリが自動ナビゲーション上で Section / Group を構成する
3. `routeGroups: "flatten"` では `(name)` ディレクトリがナビゲーション上のコンテナを作らず、子要素が親の階層へ繰り上がる
4. `(name)` ディレクトリの `index.md` は親のインデックスページとして解決される
5. `routeGroups: "url"` では `(name)/category.makit.ts` がそのディレクトリのナビゲーションノードに適用される
6. `routeGroups: "flatten"` では `(name)/category.makit.ts` を無視し、`route-group-category-ignored` 警告を出す
7. Markdown の相対リンクも Route Group を除いて解決する（`"url"` / `"flatten"` のどちらでも同じ URL になる）
8. Route Group を挟んでも実際の URL 衝突は検出する
9. Route Group 除去後にディレクトリ名やナビゲーション上の識別が衝突する場合は検出する
10. 数値プレフィックスと Route Group を同一セグメントで併用できる
11. Route Group 構文はディレクトリにのみ適用し、ファイル名には適用しない
12. `navigation.auto.routeGroups: false` で機能全体を無効化できる
