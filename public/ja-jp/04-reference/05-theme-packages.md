# テーマパッケージリファレンス

テーマパッケージは、Makit がページを描画するコンポーネント一式を提供します。`theme.extends` に指定すると、そのテーマが実装していないコンポーネントは組み込みテーマのものが使われます。

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  title: "My Documentation",
  theme: { extends: "@acme/makit-theme-corporate" },
});
```

コンポーネントを 1、2 個差し替えたいだけの場合はパッケージは不要です。[テーマのカスタマイズ](../03-guides/06-theming.md)を参照してください。

## パッケージ構成

テーマは 2 つのエントリーポイントを持ちます。コンポーネントと、Makit CLI が Node で読み込む任意のマニフェストです。

```json
{
  "name": "@acme/makit-theme-corporate",
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.mts", "import": "./dist/index.mjs" },
    "./makit-theme": { "types": "./dist/manifest.d.mts", "import": "./dist/manifest.mjs" }
  }
}
```

- `.` は実装するコンポーネントを、コンポーネント名と同じ名前で named export します（`Header`、`DocsPage` など）。生成されるサイト側が import するため、Server Component と Client Component を含められます。
- `./makit-theme` はマニフェストを default export します。Makit が Node で読み込むため、React に依存してはいけません。

パッケージ名を `makit-theme-*` にすることを推奨しますが、必須ではありません。

バンドルする場合は、`"use client"` ディレクティブが必要な各モジュールの先頭に残る設定を使ってください。1 ファイルへまとめるとディレクティブが失われます。`tsdown` の `unbundle: true` などが該当します。

## プロジェクト内のテーマ

`theme.extends` はディレクトリも受け付けます。この場合は `exports` ではなくファイル名で解決します。

```text
my-theme/
├── index.tsx          → コンポーネント
├── makit-theme.ts     → マニフェスト（任意）
└── theme.css
```

```ts
theme: { extends: "./my-theme" }
```

エントリーは `index.tsx`、`index.jsx`、`index.ts`、`index.js`、`index.mjs`、マニフェストは `makit-theme.ts`、`.mts`、`.js`、`.mjs` が対象です。エントリーが存在しないディレクトリはビルドエラーになります。

## コンポーネント

```tsx
// src/index.tsx
import type { FooterProps, HeaderProps } from "@natsuneko-laboratory/makit-runtime";

export function Header({ header, siteTitle, homeHref, actions }: HeaderProps) {
  // ...
}

export function Footer({ footer }: FooterProps) {
  // ...
}
```

コンポーネント名、props 型、Server / Client の制約は、コンポーネント単位の差し替えと同じです。一覧は[テーマのカスタマイズ](../03-guides/06-theming.md)にあります。props 型は公開 API であり、セマンティックバージョニングの対象です。

`@natsuneko-laboratory/makit-runtime` は、`react` や `next` と同様に `peerDependencies` へ宣言してください。組み込みテーマ自身も同じ形で宣言しています。

## マニフェスト

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

| 項目              | 説明                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`            | 診断メッセージに表示する名前。必須。                                                                                                                         |
| `styles`          | テーマが同梱する CSS。テーマルート基準の相対パス。利用者の `styles` より前に読み込まれるため、プロジェクト側から常に上書きできます。                         |
| `tailwindSources` | Tailwind がクラス名を走査する glob。テーマルート基準。既定はパッケージなら `**/*.{js,mjs,jsx}`、ディレクトリテーマなら `**/*.{ts,tsx,js,jsx,mjs}`。          |
| `defaults`        | `colorScheme`、`accentColor`、`radius`、`codeTheme` の推奨値。Makit の既定値とプロジェクトの設定の間に位置するため、`makit.config.ts` の指定が優先されます。 |

マニフェストは同期的に評価でき、シリアライズ可能な値のみを含む必要があります。default export は `defineTheme()` の戻り値でなければならず、素のオブジェクトは `theme-manifest-invalid` として拒否されます。

マニフェストは省略できます。その場合、テーマは CSS を同梱せず、既定の Tailwind glob を使い、トークンの推奨値を持ちません。

## コンポーネント単位の差し替えとの併用

`theme.components` は `theme.extends` の上に適用されるため、テーマを採用しつつ一部を差し替えられます。

```ts
theme: {
  extends: "@acme/makit-theme-corporate",
  components: {
    Footer: "./theme/footer.tsx",
    PrevNextLinks: false,
  },
},
```

各コンポーネントの解決順序は、`theme.components`、`theme/` ディレクトリ、`theme.extends`、組み込みテーマの順です。

## 診断

| コード                      | 意味                                                                |
| --------------------------- | ------------------------------------------------------------------- |
| `theme-module-not-found`    | `theme.extends` またはコンポーネントの指定を解決できない            |
| `theme-unknown-slot`        | `theme.components` にコンポーネント名でないキーがある               |
| `theme-slot-not-optional`   | 構造上必要なコンポーネントに `false` を指定した                     |
| `theme-ambiguous-slot-file` | `theme/` 内で同じコンポーネントに 2 つのファイルが一致した          |
| `theme-manifest-invalid`    | マニフェストが不正、または存在しない CSS を宣言している             |
| `theme-slot-file-ignored`   | `theme/` 内のファイル名がコンポーネント名の綴り誤りに見える（警告） |
| `theme-outside-project`     | コンポーネントの指定がプロジェクトルート外を指している（警告）      |

named export の欠落は `makit check` ではなくサイトのビルドが報告します。

## 例

リポジトリの [`examples/theme`](https://github.com/mika-f/makit/tree/main/examples/theme) は複数のコンポーネントを差し替えた例で、同じコードを `theme.extends` のテーマへ移す方法を README で説明しています。
