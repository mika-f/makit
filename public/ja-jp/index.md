

# Makit へようこそ

Makit は、Markdown から静的なドキュメントサイトを作るための Node.js CLI です。
文章は Markdown に、サイトの構造や細かな設定は TypeScript に書けます。

小さなプロジェクトの README をサイトに育てたいときも、複数の製品をまとめた大きなポータルを作りたいときも、同じ考え方で始められます。

## できること

- Markdown を HTML のドキュメントサイトへ変換する
- ファイル名の並び順からサイドバーを自動生成する
- TypeScript でページのタイトルやナビゲーションを型安全に設定する
- Collection、Section、Group で大規模なサイトを整理する
- 多言語ページと翻訳がない場合のフォールバックを扱う
- 静的ファイルとして GitHub Pages、Cloudflare Pages、Netlify、Vercel などへ配置する

## 最短で試す

```bash
pnpm add -D @natsuneko-laboratory/makit
pnpm exec makit init
pnpm exec makit dev
```

生成された `docs/index.md` を編集すると、開発サーバー上のページが更新されます。
詳しい手順は [はじめに](./01-getting-started.md) を読んでください。

## 読み進め方

1. [はじめに](./01-getting-started.md) — インストールから最初のビルドまで
2. [基本 concepts](./02-concepts.md) — Makit のファイル構成と考え方
3. [設定ガイド](./03-guides/configuration.md) — `makit.config.ts` を使いこなす
4. [コンテンツの整理](./03-guides/content-structure.md) — ページを増やすときの設計
5. [デプロイ](./03-guides/deployment.md) — 静的サイトを公開する
6. [CLI リファレンス](./04-reference/cli.md) — コマンド一覧

## Makit の設計を詳しく知る

このサイトの内容は、リポジトリにある [仕様書](https://github.com/mika-f/makit/tree/main/docs) を、利用者向けに読み替えたものです。仕様の細部や API の背景を確認したい場合は、そちらも参照してください。
