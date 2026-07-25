# CLI リファレンス

Makit のコマンドは、プロジェクト直下で `pnpm exec makit <command>` の形で実行できます。

| コマンド                 | 役割                                   |
| ------------------------ | -------------------------------------- |
| `makit init`             | 新しいプロジェクトの雛形を作る         |
| `makit dev`              | 開発サーバーを起動する                 |
| `makit build`            | 静的サイトをビルドする                 |
| `makit preview`          | ビルド済みサイトをローカルで配信する   |
| `makit check`            | 設定とコンテンツを検査する             |
| `makit clean`            | `.makit/` などの生成データを削除する   |
| `makit adapter generate` | Adapter の生成ファイルを個別に生成する |

## `makit init` のオプション

```bash
# theme/ ディレクトリと差し替えコンポーネントの雛形を作る
pnpm exec makit init --theme

# collection.makit.ts ベースの構成で始める
pnpm exec makit init --collections
```

| オプション          | 用途                                                               |
| ------------------- | ------------------------------------------------------------------ |
| `--theme`           | テーマの規約ディレクトリに認識される `theme/header.tsx` を作成する |
| `--collections`     | フラットな構成ではなく Collection ベースの構成で始める             |
| `--locale <tag>`    | 初期ロケール（`ja-JP` など）                                       |
| `--package-manager` | 依存関係のインストールに使う `npm` / `pnpm` / `yarn` / `bun`       |
| `--skip-install`    | 依存関係をインストールしない                                       |
| `--force`           | 既存ファイルを上書きする                                           |

## よく使うオプション

```bash
# 出力先を消してからビルド
pnpm exec makit build --clean

# 警告もエラーとして扱う
pnpm exec makit build --strict

# 別の設定ファイルを使う
pnpm exec makit build --config ./makit.config.ts
```

CI では `check` と `build --strict` を実行すると、リンク切れや構造の不整合を公開前に検出できます。
