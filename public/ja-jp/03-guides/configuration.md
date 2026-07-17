# 設定ガイド

サイト全体の設定は、プロジェクト直下の `makit.config.ts` にまとめます。

## まずは最小構成

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  title: "My Documentation",
});
```

## よく使う設定

```ts
export default defineConfig({
  title: "My Documentation",
  description: "プロジェクトの使い方をまとめたサイト",
  lang: "ja-JP",
  siteUrl: "https://docs.example.com",
  sourceDir: "docs",
  publicDir: "public",
  outDir: "dist",
  theme: {
    colorScheme: "system",
    accentColor: "violet",
  },
});
```

- `sourceDir`: Markdown を探すディレクトリ
- `publicDir`: 画像や favicon など静的アセットのディレクトリ
- `outDir`: ビルド成果物の出力先
- `siteUrl`: canonical URL や sitemap に使うサイト URL
- `theme`: カラースキームやアクセントカラー

## LLM 向けの Markdown 出力

LLM や Agent から参照しやすい Markdown エンドポイントと `llms.txt`、`llms-full.txt` は、必要なサイトだけで有効にできます。既定では無効です。

```ts
export default defineConfig({
  title: "My Documentation",
  llms: {
    enabled: true,
  },
});
```

有効にすると、各ページの URL に対応する `*.md`（例: `/guides/setup.md`）と、サイトの案内ファイルがビルド成果物に出力されます。トップページの Markdown は `/index.md` です。

## ヘッダーとフッター

```ts
export default defineConfig({
  title: "My Documentation",
  header: {
    title: "My Docs",
    links: [{ label: "GitHub", href: "https://github.com/example/docs", external: true }],
  },
  footer: {
    copyright: "© 2026 Example",
  },
});
```

## 設定を変更したら

開発中は `makit dev` が設定ファイルの変更を検知します。公開前には `makit check` と `makit build` を続けて実行するのがおすすめです。
