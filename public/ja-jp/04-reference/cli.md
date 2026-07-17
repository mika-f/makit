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
