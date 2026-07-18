# 本番限定の分析ツール

`analytics` を設定すると、分析用スクリプトを `makit build` の生成物だけに追加できます。`makit dev` では読み込まれないため、ローカル開発時の計測を避けられます。

必要なプロバイダーだけを指定してください。Google Analytics と Google Tag Manager を同時に使う場合は、GA4 タグを GTM 側で設定し、`googleAnalytics` は省略するのが一般的です。

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  title: "My Documentation",
  analytics: {
    googleAnalytics: { measurementId: "G-XXXXXXXXXX" },
    googleTagManager: { containerId: "GTM-XXXXXXX" },
    posthog: { apiKey: "phc_…" },
    umami: { websiteId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
    vercel: {},
  },
});
```

## Google Analytics

`googleAnalytics.measurementId` に GA4 の測定 ID（`G-` で始まる値）を指定します。Makit は `gtag.js` と初期化コードを追加します。

```ts
analytics: {
  googleAnalytics: { measurementId: "G-XXXXXXXXXX" },
},
```

## Google Tag Manager

`googleTagManager.containerId` に GTM コンテナ ID を指定します。Makit は標準の GTM スクリプトと、JavaScript が無効なブラウザー向けの `noscript` iframe を追加します。

```ts
analytics: {
  googleTagManager: { containerId: "GTM-XXXXXXX" },
},
```

## PostHog

`apiKey` はプロジェクトキーです。`apiHost` を省略すると PostHog Cloud US（`https://us.i.posthog.com`）を使います。EU Cloud またはセルフホストでは API ホストを指定してください。

```ts
analytics: {
  posthog: {
    apiKey: "phc_…",
    apiHost: "https://eu.i.posthog.com",
  },
},
```

## Umami

`websiteId` を指定します。既定では Umami Cloud のスクリプトを使います。セルフホストでは `scriptUrl` にスクリプト URL を指定してください。

```ts
analytics: {
  umami: {
    websiteId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    scriptUrl: "https://stats.example.com/script.js",
  },
},
```

## Vercel Web Analytics

Vercel プロジェクトの Analytics を有効化したうえで `vercel: {}` を追加します。既定の URL は `/_vercel/insights/script.js` です。プロキシ配下では、Vercel Analytics へ転送する URL を `scriptUrl` に指定してください。

```ts
analytics: {
  vercel: {},
  // プロキシ経由の場合: vercel: { scriptUrl: "https://app.example.com/_vercel/insights/script.js" },
},
```

## 任意のスクリプト

`scripts` は任意の外部スクリプトを追加する配列です。`strategy` の既定値は `afterInteractive` で、`beforeInteractive`、`lazyOnload`、`worker` も指定できます。`attributes` には `data-*`、`crossOrigin`、`integrity` など文字列属性を指定できます。

```ts
analytics: {
  scripts: [
    {
      src: "https://analytics.example.com/script.js",
      strategy: "afterInteractive",
      attributes: {
        "data-site": "docs",
        crossOrigin: "anonymous",
      },
    },
  ],
},
```
