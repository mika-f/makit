# 設定ガイド

サイト全体の設定はプロジェクト直下の `makit.config.ts` に置きます。`defineConfig` を使うと、補完と型検査を利用できます。

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  title: "My Documentation",
  description: "プロジェクトの使い方をまとめたサイト",
  lang: "ja-JP",
  siteUrl: "https://docs.example.com",
});
```

最初は `title` だけで十分です。`sourceDir`、`publicDir`、`outDir` は順に `docs`、`public`、`dist` が既定値です。公開 URL が決まったら `siteUrl` を設定すると、canonical URL と sitemap を正しく生成できます。

## 設定を機能ごとに追加する

設定は一度にすべて書く必要はありません。必要になった機能のブロックだけを追加します。

- 表示とテーマ: `header`、`footer`、`theme`、`styles`
- Markdown の表示: `markdown`
- 多言語: `i18n`
- ナビゲーションと複数製品: `navigation`、`collections`、`home`
- 検索・公開: `seo`、`sitemap`、`llms`、`github`、`deployment`
- 開発と品質確認: `build`、`dev`、`preview`、`validation`

各項目の型、既定値、実例は[設定リファレンス](../04-reference/configuration.md)を参照してください。Markdown の記法と見え方は[Markdown 構文](./markdown-syntax.md)にまとめています。

## LLM 向けの Markdown 出力

LLM や Agent が参照しやすい Markdown エンドポイント、`llms.txt`、`llms-full.txt` は既定では出力しません。必要な場合だけ有効にします。

```ts
export default defineConfig({
  title: "My Documentation",
  llms: { enabled: true },
});
```

有効にすると、各ページに対応する `*.md`（例: `/guides/setup.md`）とサイト案内ファイルが成果物へ追加されます。トップページの Markdown は `/index.md` です。

## 設定を変更したら

`makit dev` は設定ファイルの変更を検知します。公開前には次を実行します。

```bash
pnpm exec makit check
pnpm exec makit build --strict
```
