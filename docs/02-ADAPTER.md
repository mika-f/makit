# Deployment Adapter 仕様

## 1. 概要

Makit は、生成した静的サイトを各ホスティングサービスへ適合させるための Deployment Adapter を提供する。

初期対応対象は以下とする。

* Cloudflare Pages
* GitHub Pages
* Netlify
* Vercel

Deployment Adapter はホスティングサービスへのデプロイそのものを必須の責務とはせず、主に以下を担当する。

* ビルド設定の生成
* 出力ディレクトリ設定の生成
* リダイレクト設定の生成
* HTTPヘッダー設定の生成
* 404ページの調整
* `basePath` の解決
* カスタムドメイン用ファイルの生成
* CI/CD設定の生成
* プラットフォーム固有機能への変換
* 対応していない設定の警告

Makit Core は特定のホスティングサービスへ依存せず、常に静的サイトとして動作する `outDir` を生成する。

---

## 2. 用語

### Deployment Adapter

Makit の共通設定を、対象サービス固有の設定およびファイルへ変換するコンポーネント。

Adapter は公式・サードパーティーを問わず、npm パッケージが提供するファクトリー関数によって生成する。

### Adapter Factory

Adapter 固有の設定を受け取り、`DeploymentAdapter` オブジェクトを返す関数。

```ts
export interface DeploymentAdapterFactory<TOptions> {
  (options?: TOptions): DeploymentAdapter;
}
```

### Generated Deployment Files

Adapter が生成する設定ファイル、CIワークフロー、リダイレクト定義など。

---

## 3. 設計原則

### 3.1 静的成果物の可搬性

Adapter を指定した場合も、生成されるHTML、CSS、JavaScriptおよびアセットは標準的な静的ファイルでなければならない。

特定サービスのランタイムがなければ表示できない構成にはしない。

### 3.2 Adapter は任意

Adapter を設定しなくても、`makit build` は正常に動作する。

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  title: "My Documentation",
});
```

この場合、Makit は汎用的な静的サイトのみを生成する。

### 3.3 Adapter の明示的な選択

Adapter は、利用者が使用する npm パッケージを依存関係へ追加し、`makit.config.ts` で明示的に指定する。

実行環境から Adapter 自体を暗黙的に選択する機能は提供しない。

これにより、ローカル環境とCI環境で異なる成果物が生成されることを防ぐ。

### 3.4 公式・外部 Adapter の同一性

公式 Adapter とサードパーティー Adapter は、同一の `DeploymentAdapter` インターフェースを実装する。

Makit Core は公式 Adapter の名前や設定型を列挙しない。

### 3.5 設定ファイルの所有権

Makit が生成するサービス固有ファイルには、次のいずれかの管理方式を設定できる。

* `generated`: Makit が生成・上書きする
* `merge`: 既存設定と安全に統合する
* `manual`: ファイルを生成せず、必要な設定だけを表示する

標準値は `generated` とする。

### 3.6 認証情報を保存しない

APIトークン、アクセストークン、秘密鍵などは `makit.config.ts` に保存しない。

デプロイ処理を将来的に提供する場合は、環境変数または各サービスのCLI認証を使用する。

---

## 4. Adapter の指定

Adapter はファクトリー関数を呼び出し、その戻り値を `deployment.adapter` へ指定する。

文字列による指定や、`name` プロパティを持つ設定オブジェクトの直接指定は提供しない。

### Cloudflare Pages

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";
import cloudflarePages from "@natsuneko-laboratory/makit-adapter-cloudflare-pages";

export default defineConfig({
  deployment: {
    adapter: cloudflarePages(),
  },
});
```

### GitHub Pages

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";
import githubPages from "@natsuneko-laboratory/makit-adapter-github-pages";

export default defineConfig({
  deployment: {
    adapter: githubPages({
      repository: "owner/makit-docs",
      siteType: "project",
      basePath: "auto",
      generateWorkflow: true,
    }),
  },
});
```

### Netlify

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";
import netlify from "@natsuneko-laboratory/makit-adapter-netlify";

export default defineConfig({
  deployment: {
    adapter: netlify({
      generateConfig: true,

      redirects: {
        format: "toml",
      },

      headers: {
        format: "toml",
      },
    }),
  },
});
```

### Vercel

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";
import vercel from "@natsuneko-laboratory/makit-adapter-vercel";

export default defineConfig({
  deployment: {
    adapter: vercel({
      generateConfig: true,
      cleanUrls: true,
      trailingSlash: true,
    }),
  },
});
```

### サードパーティー Adapter

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";
import customAdapter from "@example/makit-adapter";

export default defineConfig({
  deployment: {
    adapter: customAdapter({
      option: true,
    }),
  },
});
```

---

## 5. Deployment 設定

```ts
export interface DeploymentConfig {
  adapter?: DeploymentAdapter;

  configFile?: {
    mode?: "generated" | "merge" | "manual";
  };

  redirects?: boolean;
  headers?: boolean;

  cleanUrls?: boolean;

  customDomain?: string;

  generateCi?: boolean;

  preview?: {
    enabled?: boolean;
  };
}
```

Adapter 固有のオプションは `DeploymentConfig` に含めない。

各 Adapter パッケージが提供するファクトリー関数の引数として管理する。

---

## 6. Adapter API

```ts
export interface DeploymentAdapter {
  /**
   * Adapterを一意に識別する名前。
   *
   * npmパッケージ名、または衝突しない識別子を推奨する。
   */
  readonly name: string;

  /**
   * Adapterのバージョン。
   *
   * キャッシュキー、ログ、診断情報に使用する。
   */
  readonly version?: string;

  /**
   * Adapterが対応する機能。
   */
  readonly capabilities: DeploymentCapabilities;

  /**
   * ページやアセットの生成前に、サイト全体へ影響する設定を解決する。
   */
  resolve(
    context: DeploymentResolveContext,
  ): Promise<DeploymentResolvedConfig>;

  /**
   * Adapter設定とMakit設定の整合性を検証する。
   */
  validate(
    context: DeploymentAdapterContext,
  ): Promise<DeploymentDiagnostic[]>;

  /**
   * Static Export完了後に、サービス固有ファイルを生成する。
   */
  generate(
    context: DeploymentAdapterContext,
  ): Promise<DeploymentAdapterResult>;
}
```

Adapter の各メソッドは、同期処理を内部に含む場合も常に `Promise` を返す。

---

## 7. Resolve Phase

`resolve` は Markdown処理およびNext.jsビルドより前に実行する。

主な責務:

* `basePath` の解決
* `siteUrl` の補完または検証
* trailing slash方針の解決
* 出力ディレクトリの検証
* プラットフォーム固有制約の適用
* ビルド全体へ影響する設定の確定

```ts
export interface DeploymentResolveContext {
  projectRoot: string;

  config: Readonly<MakitConfig>;

  environment: Readonly<
    Record<string, string | undefined>
  >;
}
```

```ts
export interface DeploymentResolvedConfig {
  basePath?: string;
  siteUrl?: string;
  trailingSlash?: boolean;
  outDir?: string;

  diagnostics?: DeploymentDiagnostic[];
}
```

Adapter が返した値は、利用者設定を無条件に上書きしてはならない。

利用者設定とAdapter設定が矛盾する場合は、Adapterの規則に基づいて警告またはエラーを返す。

---

## 8. Validate Phase

`validate` は、Resolve Phase後に確定した設定、生成予定ページ、リダイレクト、ヘッダー規則を検証する。

```ts
export interface DeploymentAdapterContext {
  projectRoot: string;
  outDir: string;

  config: ResolvedMakitConfig;

  pages: GeneratedPage[];
  redirects: GeneratedRedirect[];
  headers: GeneratedHeaderRule[];

  environment: Readonly<
    Record<string, string | undefined>
  >;
}
```

検証例:

* `basePath` が対象サービスに適しているか
* `siteUrl` とカスタムドメインが矛盾していないか
* リダイレクト形式を対象サービスで表現できるか
* HTTPヘッダーが対象サービスで利用できるか
* 出力先がプラットフォームの制約に適合しているか
* 既存設定ファイルと競合しないか

---

## 9. Generate Phase

`generate` は Next.js Static Export完了後に実行する。

主な責務:

* リダイレクトファイルの生成
* HTTPヘッダー設定の生成
* CIワークフローの生成
* `.nojekyll` の生成
* `CNAME` の生成
* `netlify.toml` の生成
* `vercel.json` の生成
* 最終成果物の検証

```ts
export interface DeploymentAdapterResult {
  files: GeneratedDeploymentFile[];

  warnings: DeploymentDiagnostic[];
}
```

`effectiveBasePath` と `capabilities` は Resolve PhaseおよびAdapter本体から取得できるため、Generate Phaseの結果には含めない。

---

## 10. 生成ファイル

```ts
export interface GeneratedDeploymentFile {
  /**
   * destinationからの相対パス。
   */
  path: string;

  content: string | Uint8Array;

  destination:
    | "project-root"
    | "output-directory";

  /**
   * 既存ファイルの上書きを許可するか。
   *
   * 実際の処理ではconfigFile.modeも考慮する。
   */
  overwrite: boolean;
}
```

GitHub Actionsワークフローも `project-root` 配下のファイルとして扱う。

```text
.github/workflows/deploy-makit.yml
```

そのため、`github-workflow` のようなプラットフォーム固有の destination は定義しない。

---

## 11. 診断情報

```ts
export interface DeploymentDiagnostic {
  level: "info" | "warning" | "error";

  code: string;
  message: string;

  file?: string;

  details?: string;

  suggestion?: string;
}
```

例:

```ts
{
  level: "warning",
  code: "github-pages.unsupported-headers",
  message:
    "GitHub Pages does not support custom response headers.",
  suggestion:
    "Remove the header rules or use another deployment adapter.",
}
```

`error` が1件以上存在する場合、ビルドを停止する。

---

## 12. Adapter の実行タイミング

`makit build` の処理順序は以下とする。

```text
設定ファイル読込
    ↓
基本設定検証
    ↓
Deployment Adapter取得
    ↓
Adapter Resolve Phase
    ↓
basePath・siteUrl・trailingSlash確定
    ↓
Markdown解析
    ↓
ルート生成
    ↓
国際化フォールバック生成
    ↓
共通リダイレクト・ヘッダー生成
    ↓
Adapter Validate Phase
    ↓
Next.js Static Export
    ↓
Adapter Generate Phase
    ↓
サービス固有ファイル出力
    ↓
最終検証
```

`basePath` はページURLやアセットURLへ影響するため、Markdown処理およびNext.jsビルドより前に確定しなければならない。

---

## 13. 共通リダイレクトモデル

Makit Core は、プラットフォーム固有形式へ変換する前に共通リダイレクトモデルを生成する。

```ts
export interface GeneratedRedirect {
  from: string;
  to: string;

  status:
    | 301
    | 302
    | 307
    | 308;

  conditions?: {
    language?: string[];
    country?: string[];
  };

  force?: boolean;

  source:
    | "user"
    | "i18n-root"
    | "i18n-fallback"
    | "clean-url"
    | "migration";
}
```

設定例:

```ts
export default defineConfig({
  redirects: [
    {
      from: "/docs/old-page/",
      to: "/en-us/new-page/",
      status: 308,
    },
  ],
});
```

Adapter はサービスの能力に応じて、共通モデルを次のいずれかへ変換する。

* ネイティブHTTPリダイレクト
* サービス固有設定
* 静的リダイレクトHTML
* 非対応警告

---

## 14. 共通ヘッダーモデル

```ts
export interface GeneratedHeaderRule {
  path: string;

  headers: Record<string, string>;
}
```

設定例:

```ts
export default defineConfig({
  headers: [
    {
      path: "/*",
      headers: {
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy":
          "strict-origin-when-cross-origin",
      },
    },
  ],
});
```

標準セキュリティヘッダーを有効化できる。

```ts
export default defineConfig({
  deployment: {
    headers: true,
  },
});
```

標準候補:

```text
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

Content Security Policy は利用者のカスタムスクリプトや画像配信元へ影響するため、標準では自動生成しない。

---

# 15. Cloudflare Pages Adapter

## 15.1 パッケージ

```text
@natsuneko-laboratory/makit-adapter-cloudflare-pages
```

## 15.2 設定型

```ts
export interface CloudflarePagesOptions {
  projectName?: string;

  generateWranglerConfig?: boolean;

  redirects?: {
    mode?: "native" | "html";
  };

  headers?: {
    enabled?: boolean;
  };
}
```

## 15.3 ファクトリー

```ts
import cloudflarePages, {
  type CloudflarePagesOptions,
} from "@natsuneko-laboratory/makit-adapter-cloudflare-pages";
```

概念的な定義:

```ts
export default function cloudflarePages(
  options?: CloudflarePagesOptions,
): DeploymentAdapter;
```

## 15.4 基本設定

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";
import cloudflarePages from
  "@natsuneko-laboratory/makit-adapter-cloudflare-pages";

export default defineConfig({
  deployment: {
    adapter: cloudflarePages({
      projectName: "makit-docs",
    }),
  },
});
```

推奨設定:

```text
Build command:
npm run build

Build output directory:
dist
```

Makit は静的出力を生成するため、Cloudflare Pages上ではNext.jsサーバーランタイムを使用しない。

## 15.5 生成ファイル

必要に応じて以下を `outDir` に生成する。

```text
dist/
├── _redirects
├── _headers
└── ...
```

### `_redirects`

```text
/ /en-us/ 302
/old-page/ /en-us/new-page/ 308
```

### `_headers`

```text
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

## 15.6 国際化

`i18n.root.behavior: "default"` の場合、`/` からデフォルトロケールへのネイティブリダイレクトを生成できる。

`i18n.root.behavior: "detect"` の場合は、ブラウザに保存された設定やクライアント側判定を維持するため、Makitが生成する言語検出HTMLを使用する。

## 15.7 Functions

MVPではCloudflare Pages Functionsを生成しない。

将来的にEdgeリダイレクトへ対応する場合は、Adapter固有オプションとして追加する。

---

# 16. GitHub Pages Adapter

## 16.1 パッケージ

```text
@natsuneko-laboratory/makit-adapter-github-pages
```

## 16.2 設定型

```ts
export interface GitHubPagesOptions {
  repository?: string | "auto";

  siteType?:
    | "project"
    | "user"
    | "organization";

  basePath?: "auto" | string;

  customDomain?: string;

  generateWorkflow?: boolean;

  workflowPath?: string;

  branch?: string;
}
```

## 16.3 基本設定

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";
import githubPages from
  "@natsuneko-laboratory/makit-adapter-github-pages";

export default defineConfig({
  deployment: {
    adapter: githubPages({
      repository: "owner/makit-docs",
      siteType: "project",
      basePath: "auto",
      generateWorkflow: true,
    }),
  },
});
```

## 16.4 `basePath`

GitHub Project Pagesでは、通常リポジトリ名をパスへ含める必要がある。

```text
Repository:
owner/makit-docs

Public URL:
https://owner.github.io/makit-docs/
```

`basePath: "auto"` の場合は、以下を解決する。

```text
/makit-docs
```

User Pages、Organization Pages、またはカスタムドメインの場合は、標準で空文字とする。

## 16.5 リポジトリの解決

`repository: "auto"` の場合は、次の順で解決する。

1. `GITHUB_REPOSITORY`
2. Gitのremote URL
3. 解決不能としてエラー

Adapter自体の選択は自動化せず、リポジトリ情報の補完にのみ環境情報を利用する。

## 16.6 Actionsワークフロー

`generateWorkflow: true` の場合、標準で以下を生成する。

```text
.github/workflows/deploy-makit.yml
```

```yaml
name: Deploy Makit documentation

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci
      - run: npm run build

      - uses: actions/configure-pages@v5

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    runs-on: ubuntu-latest
    needs: build

    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

Actionのバージョンは、Adapterリリース時点で検証した値をテンプレートへ固定する。

## 16.7 Jekyll無効化

以下を生成する。

```text
dist/.nojekyll
```

## 16.8 カスタムドメイン

```ts
githubPages({
  customDomain: "docs.example.com",
});
```

指定時は以下を生成する。

```text
dist/CNAME
```

内容:

```text
docs.example.com
```

## 16.9 リダイレクトとヘッダー

GitHub Pagesでは以下の方針とする。

* リダイレクト: 静的リダイレクトHTML
* カスタムHTTPヘッダー: 非対応警告
* `meta` で代替可能な一部設定: 将来対応

国際化ルート `/` も静的HTMLとして生成する。

---

# 17. Netlify Adapter

## 17.1 パッケージ

```text
@natsuneko-laboratory/makit-adapter-netlify
```

## 17.2 設定型

```ts
export interface NetlifyOptions {
  generateConfig?: boolean;

  configPath?: string;

  redirects?: {
    format?: "toml" | "file";
  };

  headers?: {
    format?: "toml" | "file";
  };

  prettyUrls?: boolean;

  i18nRouting?: "client" | "native";
}
```

## 17.3 基本設定

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";
import netlify from "@natsuneko-laboratory/makit-adapter-netlify";

export default defineConfig({
  deployment: {
    adapter: netlify({
      generateConfig: true,

      redirects: {
        format: "toml",
      },

      headers: {
        format: "toml",
      },
    }),
  },
});
```

## 17.4 `netlify.toml`

標準ではプロジェクトルートへ生成する。

```toml
[build]
command = "npm run build"
publish = "dist"
```

リダイレクト例:

```toml
[[redirects]]
from = "/"
to = "/en-us/"
status = 302
force = true
```

ヘッダー例:

```toml
[[headers]]
for = "/*"

[headers.values]
X-Content-Type-Options = "nosniff"
Referrer-Policy = "strict-origin-when-cross-origin"
```

## 17.5 ファイル形式

設定により以下を生成できる。

```text
dist/_redirects
dist/_headers
```

```ts
netlify({
  redirects: {
    format: "file",
  },

  headers: {
    format: "file",
  },
});
```

## 17.6 国際化

`i18nRouting: "client"` では、Makit共通の静的言語検出ページを使用する。

`i18nRouting: "native"` では、Netlifyの言語条件へ変換可能な範囲でネイティブリダイレクトを生成する。

MVPの標準値は `client` とする。

## 17.7 設定のマージ

`configFile.mode: "merge"` の場合は、次のセクションのみをMakit管理対象とする。

* `[build]`
* Makitが生成した `[[redirects]]`
* Makitが生成した `[[headers]]`

既存ルールを破壊してはならない。

競合時は警告またはエラーとする。

---

# 18. Vercel Adapter

## 18.1 パッケージ

```text
@natsuneko-laboratory/makit-adapter-vercel
```

## 18.2 設定型

```ts
export interface VercelOptions {
  generateConfig?: boolean;

  configPath?: string;

  cleanUrls?: boolean;

  trailingSlash?: boolean;
}
```

## 18.3 基本設定

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";
import vercel from "@natsuneko-laboratory/makit-adapter-vercel";

export default defineConfig({
  deployment: {
    adapter: vercel({
      generateConfig: true,
      cleanUrls: true,
      trailingSlash: true,
    }),
  },
});
```

## 18.4 配信方式

MakitはNext.jsをビルド基盤として使用するが、Vercel上では `outDir` を静的サイトとして配信する。

推奨設定:

```text
Build Command:
npm run build

Output Directory:
dist

Framework Preset:
Other
```

Makitの内部 `.makit/` をVercelのNext.jsプロジェクトとして直接配信する方式は、MVPでは対応しない。

## 18.5 `vercel.json`

標準でプロジェクトルートへ生成する。

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": null,
  "cleanUrls": true,
  "trailingSlash": true
}
```

Makit設定とAdapterオプションが矛盾する場合はエラーとする。

## 18.6 リダイレクト

```json
{
  "redirects": [
    {
      "source": "/old-page/",
      "destination": "/en-us/new-page/",
      "permanent": true
    }
  ]
}
```

共通リダイレクトのステータスコードを完全に表現できない場合は、意味が最も近い設定へ変換して警告する。

## 18.7 ヘッダー

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

## 18.8 国際化

`i18n.root.behavior: "default"` の場合は、Vercelのネイティブリダイレクトへ変換する。

`i18n.root.behavior: "detect"` の場合は、Makitが生成するクライアント言語検出ページを使用する。

Edge MiddlewareはMVP対象外とする。

---

# 19. Adapter Capability

各Adapterは対応機能を宣言する。

```ts
export interface DeploymentCapabilities {
  nativeRedirects: boolean;
  conditionalRedirects: boolean;
  customHeaders: boolean;
  custom404: boolean;
  basePath: boolean;
  customDomainFile: boolean;
  generatedCi: boolean;
  edgeRuntime: boolean;
}
```

初期対応表:

| 機能            | Cloudflare Pages | GitHub Pages | Netlify | Vercel |
| ------------- | ---------------: | -----------: | ------: | -----: |
| 静的サイト配信       |               対応 |           対応 |      対応 |     対応 |
| ネイティブリダイレクト   |               対応 |          非対応 |      対応 |     対応 |
| 条件付きリダイレクト    |             制限付き |          非対応 |      対応 |   制限付き |
| カスタムヘッダー      |               対応 |          非対応 |      対応 |     対応 |
| カスタム404       |               対応 |           対応 |      対応 |     対応 |
| 自動`basePath`  |               不要 |           対応 |      不要 |     不要 |
| カスタムドメイン用ファイル |               不要 |      `CNAME` |      不要 |     不要 |
| CI設定生成        |               任意 |           対応 |      任意 |     任意 |
| Edge処理        |           MVP対象外 |          非対応 |  MVP対象外 | MVP対象外 |

Capabilityは、Makit CoreがAdapter名を判定せずに出力方式を選択するために使用する。

---

# 20. 公式 Adapter パッケージ

公式 Adapter は Makit 本体とは別パッケージとして提供する。

```text
@natsuneko-laboratory/makit-adapter-cloudflare-pages
@natsuneko-laboratory/makit-adapter-github-pages
@natsuneko-laboratory/makit-adapter-netlify
@natsuneko-laboratory/makit-adapter-vercel
```

利用者は、使用するAdapterのみを依存関係へ追加する。

```bash
npm install --save-dev \
  @natsuneko-laboratory/makit \
  @natsuneko-laboratory/makit-adapter-cloudflare-pages
```

```bash
pnpm add --save-dev \
  @natsuneko-laboratory/makit \
  @natsuneko-laboratory/makit-adapter-cloudflare-pages
```

Makit本体は公式Adapterを直接依存関係に含めない。

これにより、不要なプラットフォーム固有コードや依存パッケージのインストールを防ぐ。

---

## 20.1 パッケージのexport

各公式Adapterはdefault exportとしてファクトリー関数を提供する。

```ts
import cloudflarePages from
  "@natsuneko-laboratory/makit-adapter-cloudflare-pages";
```

設定型はnamed exportとして提供する。

```ts
import cloudflarePages, {
  type CloudflarePagesOptions,
} from "@natsuneko-laboratory/makit-adapter-cloudflare-pages";
```

概念例:

```ts
export type {
  CloudflarePagesOptions,
};

export default function cloudflarePages(
  options?: CloudflarePagesOptions,
): DeploymentAdapter;
```

---

## 20.2 Makitとの互換性

各Adapterパッケージは、対応するMakit Coreのバージョン範囲を `peerDependencies` で宣言する。

概念例:

```json
{
  "peerDependencies": {
    "@natsuneko-laboratory/makit": "^0.1.0"
  }
}
```

Adapter APIに破壊的変更がある場合は、MakitおよびAdapterのメジャーバージョンで管理する。

---

# 21. Adapter の自動選択

実行環境からAdapter自体を自動選択する機能は提供しない。

次の指定はサポートしない。

```ts
deployment: {
  adapter: "auto",
}
```

また、次のような文字列指定もサポートしない。

```ts
deployment: {
  adapter: "netlify",
}
```

同じ設定から常に同じAdapterが選択されるよう、ファクトリー関数を明示的に指定する。

個々のAdapterは、自身の設定値を補完するために環境変数を利用できる。

例:

```ts
deployment: {
  adapter: githubPages({
    repository: "auto",
  }),
}
```

この場合も、GitHub Pages Adapter自体は明示的に選択されている。

---

# 22. 設定ファイル生成コマンド

サービス固有ファイルを生成するコマンドを提供する。

```bash
makit adapter generate
```

対象Adapterは `makit.config.ts` から取得する。

Adapter名をCLI引数として指定する形式は提供しない。

オプション:

```text
--force
--dry-run
--check
```

## 22.1 `--dry-run`

変更予定のファイルと差分のみを表示する。

```bash
makit adapter generate --dry-run
```

## 22.2 `--check`

生成済みファイルが現在のMakit設定およびAdapter設定と一致しているか検証する。

```bash
makit adapter generate --check
```

CIで不一致がある場合は非ゼロの終了コードを返す。

## 22.3 Adapter未設定

Adapterが設定されていない場合は、設定不足としてコマンドを終了する。

```text
Error: No deployment adapter is configured.
```

`makit build` 自体はAdapter未設定でも正常に動作する。

---

# 23. `makit check` への統合

Deployment Adapterに関して以下を検証する。

* Adapterオブジェクトが有効なインターフェースを持つか
* AdapterとMakit Coreのバージョンに互換性があるか
* Adapter設定が正しいか
* `basePath` が適切か
* `siteUrl` とカスタムドメインが矛盾していないか
* 生成設定ファイルが古くないか
* サービス非対応機能が設定されていないか
* 出力ディレクトリが一致しているか
* GitHub Pagesのリポジトリ名を解決できるか
* カスタムドメインとProject Pagesの`basePath`が競合していないか
* リダイレクトが循環していないか
* リダイレクト元が重複していないか
* ヘッダー規則が競合していないか

---

# 24. ログ

Cloudflare Pages:

```text
✓ Deployment adapter: @natsuneko-laboratory/makit-adapter-cloudflare-pages
✓ Generated dist/_redirects
✓ Generated dist/_headers
```

GitHub Pages:

```text
✓ Deployment adapter: @natsuneko-laboratory/makit-adapter-github-pages
✓ Resolved base path: /makit-docs
✓ Generated dist/.nojekyll
✓ Generated .github/workflows/deploy-makit.yml
```

Netlify:

```text
✓ Deployment adapter: @natsuneko-laboratory/makit-adapter-netlify
✓ Generated netlify.toml
✓ Added 3 redirects
✓ Added 2 header rules
```

Vercel:

```text
✓ Deployment adapter: @natsuneko-laboratory/makit-adapter-vercel
✓ Generated vercel.json
✓ Static output directory: dist
```

非対応機能:

```text
Warning: GitHub Pages does not support custom response headers.
2 header rules were omitted.
```

---

# 25. パッケージ構成

```text
packages/
├── makit/
├── cli/
├── core/
├── markdown/
├── runtime/
├── theme-default/
├── adapter-cloudflare-pages/
├── adapter-github-pages/
├── adapter-netlify/
└── adapter-vercel/
```

Adapter APIの型を、Adapterパッケージから参照可能な安定したエントリーポイントで公開する。

例:

```ts
import type {
  DeploymentAdapter,
  DeploymentAdapterContext,
  DeploymentAdapterResult,
} from "@natsuneko-laboratory/makit/adapter";
```

Adapter実装がMakit内部の非公開モジュールへ依存することは禁止する。

---

# 26. 完全な設定例

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";

import cloudflarePages from
  "@natsuneko-laboratory/makit-adapter-cloudflare-pages";

export default defineConfig({
  title: "Makit Documentation",
  siteUrl: "https://docs.example.com",

  sourceDir: "docs",
  outDir: "dist",

  i18n: {
    defaultLocale: "en-US",

    locales: [
      {
        locale: "en-US",
        label: "English",
      },
      {
        locale: "ja-JP",
        label: "日本語",
      },
    ],

    fallback: {
      enabled: true,
      behavior: "render",
      showNotice: true,
    },

    root: {
      behavior: "detect",
    },
  },

  deployment: {
    adapter: cloudflarePages({
      projectName: "makit-documentation",

      redirects: {
        mode: "native",
      },

      headers: {
        enabled: true,
      },
    }),

    configFile: {
      mode: "generated",
    },

    redirects: true,
    headers: true,
  },

  redirects: [
    {
      from: "/documentation/",
      to: "/en-us/",
      status: 308,
    },
  ],

  headers: [
    {
      path: "/*",
      headers: {
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy":
          "strict-origin-when-cross-origin",
      },
    },
  ],
});
```

---

# 27. MVP対象

初期版では以下を実装する。

* Adapterファクトリー方式
* Adapter共通インターフェース
* Resolve / Validate / Generateの実行フェーズ
* Adapter Capability
* Cloudflare Pages Adapter
* GitHub Pages Adapter
* Netlify Adapter
* Vercel Adapter
* 共通リダイレクトモデル
* 共通ヘッダーモデル
* サービス固有設定ファイル生成
* GitHub Pages用Actionsワークフロー生成
* GitHub Pages用`basePath`解決
* GitHub Pages用`.nojekyll`
* GitHub Pages用`CNAME`
* 非対応機能の警告
* `makit adapter generate`
* `makit adapter generate --check`
* `makit check`との統合
* サードパーティーAdapter
* AdapterとMakit Coreの互換性検証

MVPでは以下を対象外とする。

* Makit CLIからの直接デプロイ
* APIトークン管理
* Adapterの自動選択
* 文字列によるAdapter指定
* Cloudflare Workers
* Cloudflare Pages Functions
* Netlify Functions
* Netlify Edge Functions
* Vercel Functions
* Vercel Edge Middleware
* プレビューURLの取得
* デプロイ履歴管理
* ロールバック
* 複数デプロイ先への同時出力

---

# 28. 受け入れ基準

1. Adapterを指定しなくても従来どおりビルドできる
2. Adapterをファクトリー関数の戻り値として指定できる
3. 公式AdapterとサードパーティーAdapterを同じAPIで利用できる
4. 各Adapter固有の設定にTypeScriptの型補完が効く
5. 各Adapterで同一のMarkdownから静的サイトを生成できる
6. Cloudflare Pages向けに `_redirects` と `_headers` を生成できる
7. GitHub Pages向けに適切な `basePath` を設定できる
8. GitHub Pages向けActionsワークフローを生成できる
9. GitHub Pages向けに `.nojekyll` を生成できる
10. カスタムドメイン指定時に `CNAME` を生成できる
11. Netlify向けに `netlify.toml` を生成できる
12. Vercel向けに `vercel.json` を生成できる
13. 対応サービスでネイティブリダイレクトを利用できる
14. GitHub Pagesでは静的リダイレクトHTMLへフォールバックできる
15. 非対応のHTTPヘッダー設定を警告できる
16. Adapterが確定した `basePath` をNext.jsビルド前に適用できる
17. 生成設定ファイルが古い場合にCIで検出できる
18. Adapterを変更してもMarkdownソースを変更する必要がない
19. Adapterの選択が実行環境によって暗黙的に変化しない
20. 利用しない公式Adapterをインストールする必要がない
