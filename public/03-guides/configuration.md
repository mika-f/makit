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

## ヘッダーとフッター

```ts
export default defineConfig({
  title: "My Documentation",
  header: {
    title: "My Docs",
    links: [
      { label: "GitHub", href: "https://github.com/example/docs", external: true },
    ],
  },
  footer: {
    copyright: "© 2026 Example",
  },
});
```

## 設定を変更したら

開発中は `makit dev` が設定ファイルの変更を検知します。公開前には `makit check` と `makit build` を続けて実行するのがおすすめです。
