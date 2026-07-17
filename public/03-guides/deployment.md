# デプロイ

`makit build` が作るのは、サーバーを必要としない静的ファイルです。出力先の `dist/` を、利用するホスティングサービスへ配置します。

## Adapter を使わない場合

単純な静的ホスティングなら、Adapter は必須ではありません。

```bash
pnpm exec makit build
```

## Adapter を使う場合

Adapter はホスティングサービス固有の設定ファイルや CI ワークフローを生成します。設定は文字列ではなく、ファクトリー関数を明示的に呼び出します。

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";
import githubPages from "@natsuneko-laboratory/makit-adapter-github-pages";

export default defineConfig({
  title: "My Documentation",
  deployment: {
    adapter: githubPages({
      repository: "owner/docs",
      siteType: "project",
      basePath: "auto",
      generateWorkflow: true,
    }),
  },
});
```

現在想定している公式 Adapter は Cloudflare Pages、GitHub Pages、Netlify、Vercel です。

## 認証情報について

API トークンや秘密鍵は `makit.config.ts` に書かないでください。デプロイ側の環境変数、または各サービスの CLI 認証を利用します。

## 公開前の確認

```bash
pnpm exec makit check
pnpm exec makit build
pnpm exec makit preview
```

`preview` で、生成後の静的ファイルがホスティング環境で期待どおり表示されるか確認できます。
