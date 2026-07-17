# はじめに

ここでは、Makit のサイトを作ってローカルで確認し、静的ファイルを出力するまでを進めます。

## 1. インストール

Node.js 20 以上のプロジェクトで、Makit を開発依存関係に追加します。

```bash
pnpm add -D @natsuneko-laboratory/makit
```

npm や yarn を使う場合も、通常どおりパッケージを追加できます。

## 2. プロジェクトを作る

空のディレクトリで `init` を実行します。

```bash
pnpm exec makit init
```

次のようなファイルが作られます。

```text
my-docs/
├── docs/
│   └── index.md
├── public/
├── makit.config.ts
└── package.json
```

`docs/index.md` がサイトのトップページです。まずは見出しや文章を自分のプロジェクト向けに書き換えてみてください。

## 3. 開発サーバーを起動する

```bash
pnpm exec makit dev
```

ブラウザで表示された URL を開きます。Markdown を保存すると、ページが自動的に更新されます。

## 4. 静的サイトを出力する

```bash
pnpm exec makit build
```

既定では `dist/` に HTML、CSS、JavaScript、画像などが出力されます。`dist/` をそのまま静的ホスティングサービスへ配置できます。

## 困ったとき

ビルド前に設定やページの問題を確認したい場合は、`check` を使います。

```bash
pnpm exec makit check
```

リンク切れ、重複した URL、メタデータの不整合などを早い段階で見つけられます。
