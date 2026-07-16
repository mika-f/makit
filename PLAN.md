# Makit 実装計画 (PLAN)

仕様書 v0.1 (MVP) に基づく実装計画。各フェーズは独立して検証可能な状態で完了させる。

---

## 0. 技術スタックと前提決定

| 項目 | 決定 | 理由 |
| --- | --- | --- |
| 言語 | TypeScript (strict) | 仕様要件 |
| Node.js | >= 20.x | Next.js 16 の要件、LTS |
| パッケージマネージャ | pnpm (workspace) | モノレポ管理の標準 |
| モノレポツール | pnpm workspace + turborepo | ビルド順序・キャッシュ管理 |
| ビルドツール | **tsdown** | ESM/CJS デュアル出力、oxc ベースで高速。確定 |
| CLI フレームワーク | citty または commander | サブコマンド・オプション解析 |
| 設定ローダー | jiti または importx | `makit.config.ts` の TS 直接読込 |
| スキーマ検証 | **zod v4** | 設定・Front Matter の実行時検証。確定(`z.strictObject` 等の v4 API を利用) |
| Markdown | unified / remark / rehype | 仕様要件 |
| Front Matter | gray-matter または vfile-matter | YAML 解析 |
| ハイライト | shiki (v1+, hast 出力) | 仕様要件、ビルド時処理 |
| ファイル監視 | chokidar | `makit dev` の監視 |
| 静的サーバー | sirv または独自実装 | `makit preview` |
| テスト | vitest | モノレポ対応、高速 |
| Lint / Format | **oxlint + oxfmt** | 確定。oxc ベースで高速、ESLint/Prettier 相当を代替 |
| Next.js | **16.x** (App Router, `output: "export"`) | 仕様要件、確定 |
| Tailwind CSS | v4 | `.makit/` 内部に閉じ込める |

### 未確定事項(実装中に判断)
- Next.js を `.makit/` 側の依存にするか、makit 本体の依存として node_modules を共有するか
  → **方針: makit パッケージの依存として持ち、`.makit/` からは相対 or workspace 解決で参照**(利用者に `next` のインストールを要求しない)
- Next.js 16 は Turbopack がデフォルトビルダーになっている。`output: "export"` (Static Export) との組み合わせを Phase 4 冒頭で spike し、問題が出た場合は `next.config.mjs` 側で webpack ビルドへ明示フォールバックする
- oxlint は ESLint と比較してプラグイン(特に React Hooks 系ルール)のカバレッジが狭い場合がある。不足するルールは Phase 1 で許容するか個別に補う判断を行う
- Shiki の言語自動収集(コードブロックから使用言語を検出)は MVP では「全ビルトイン言語の遅延読込」で開始し、後で最適化

---

## 1. リポジトリ / パッケージ構成

仕様 §34 の「初期は 3 パッケージ統合」案を採用する。

```text
makit/
├── packages/
│   ├── makit/            # 利用者向け統合パッケージ (defineConfig, 公開型, CLI bin)
│   │   └── src/
│   │       ├── cli/      # コマンド解析, ログ, 終了コード, dev server 管理
│   │       ├── core/     # 設定読込, スキャン, ルート, i18n, ナビ, 検証, ビルド制御, キャッシュ
│   │       ├── markdown/ # remark/rehype パイプライン, Front Matter, Shiki, リンク変換
│   │       ├── config/   # defineConfig, zod スキーマ, 正規化, デフォルト値
│   │       └── types/    # 公開型定義
│   ├── makit-runtime/    # .makit/app から import される React コンポーネント & ヘルパー
│   │   └── src/
│   │       ├── components/  # Layout, Sidebar, Header, Footer, Toc, CodeBlock, LocaleSwitcher...
│   │       ├── data/        # generated JSON の読込ヘルパー
│   │       └── metadata/    # Next.js Metadata 生成
│   └── makit-theme-default/ # Tailwind ベースの標準テーマ CSS (runtime に統合開始でも可)
├── examples/
│   └── basic/            # i18n 込みのサンプルプロジェクト (E2E テスト兼ドキュメント)
├── e2e/                  # CLI 統合テスト
├── package.json          # workspace root
├── turbo.json
├── tsconfig.base.json
├── LICENSE (MIT)
└── README.md
```

- `makit-theme-default` は初期は `makit-runtime` に同居させ、CSS が肥大化したら分離する。
- `makit` の `bin` フィールドで `makit` コマンドを提供する。

---

## 2. 実装フェーズ

### Phase 1: 基盤 — モノレポ + CLI 骨格 + 設定システム

**ゴール: `makit --version` / `makit init` が動き、`makit.config.ts` を読み込んで検証できる**

1. pnpm workspace / turborepo / tsconfig / oxlint+oxfmt / vitest のセットアップ
2. `packages/makit` の scaffold(bin エントリ、ESM)
3. CLI 骨格
   - コマンドルーター: `init` / `dev` / `build` / `preview` / `clean` / `check`
   - 共通オプション: `--config` `--cwd` `--verbose` `--silent` `--log-format` `--version` `--help`
   - ロガー: `pretty` / `json` の 2 形式、verbose/silent レベル制御
   - 終了コード規約: 0=成功, 1=エラー, 2=検証失敗(check/strict 用)
4. 設定システム (`config/`)
   - `defineConfig`(型付きアイデンティティ関数)
   - `MakitConfig` 全型定義(仕様 §11 準拠。i18n / navigation / theme / markdown / seo / sitemap / build / dev / preview / validation)
   - 設定ファイル探索: `makit.config.{ts,mts,js,mjs}`、優先順位、複数存在時の警告
   - jiti による TS 設定の読込
   - zod スキーマによる検証 + わかりやすいエラーメッセージ
   - 正規化処理:
     - `basePath`: 先頭 `/` 付与・末尾 `/` 除去
     - ロケール: BCP 47 → URL 用小文字化 (`ja-JP` → `ja-jp`)、正規化後の重複検出
     - `defaultLocale ∈ locales` の検証
     - デフォルト値のマージ (`lang: "en"`, `sourceDir: "docs"`, `publicDir: "public"`, `outDir: "dist"`, `basePath: ""` など)
   - **成果物: `ResolvedConfig` 型(すべてのオプショナルが解決済みの内部表現)**
5. `makit init`
   - `makit.config.ts` / `docs/`(ロケール別 or 単一)/ `public/` / `.gitignore`(`.makit/`, `dist/` 追加)/ `package.json` 生成
   - オプション: `--locale` `--package-manager` `--force` `--skip-install`
   - 既存ファイル衝突時は `--force` なしでエラー
6. テスト: 設定ローダー・正規化・バリデーションの単体テスト、init のスナップショットテスト

### Phase 2: コンテンツパイプライン — スキャン + Markdown 処理

**ゴール: docs/ を読み込んで `GeneratedPage` の JSON を出力できる(Next.js なしで検証可能)**

1. Source Scanner (`core/scanner`)
   - `sourceDir` 配下の `.md` / `.markdown` を収集
   - i18n 有効時: `{sourceDir}/{normalizedLocale}/`、ロケール別 `sourceDir` 上書き対応
   - 除外規則: `node_modules` / `.git` / `.makit` / `outDir` / dotfile
2. Front Matter (`markdown/frontmatter`)
   - gray-matter で抽出、zod で `PageFrontMatter` を検証(仕様 §14 の全フィールド)
   - 解析失敗はエラー(ファイルパス・行情報付き)
3. Route Generator (`core/routes`)
   - `index.md` → `/`、`foo.md` → `/foo/`、slug (文字列 / 配列) 上書き
   - 末尾スラッシュ正規化 (`trailingSlash` 設定)
   - ロケール接頭辞付与
   - **重複ルート検出 → エラー**(`guides.md` vs `guides/index.md`)
   - **同一ロケール内の重複 pageId 検出 → エラー**
4. Markdown Processor (`markdown/pipeline`)
   - unified パイプライン構築(仕様 §19.1 の順序):
     - remark-parse → remark-gfm(設定制御)→ 内部 remark プラグイン → ユーザー remark プラグイン → remark-rehype(`allowDangerousHtml` は既定 false)→ 内部 rehype プラグイン(見出し ID / アンカー、外部リンク target/rel、内部リンク変換)→ ユーザー rehype プラグイン → Shiki → HTML 直列化
   - プラグイン指定形式: `plugin` / `[plugin, options]` の両対応
   - 見出し抽出: `GeneratedHeading[]`(id, depth, text)、重複 ID は連番 (`-1`, `-2`)
   - タイトル推定: front matter `title` → 最初の H1 → ファイル名 → pageId
   - ToC 用データ (minDepth/maxDepth は表示側で絞る)
5. Shiki 統合 (`markdown/shiki`)
   - 単一テーマ / light+dark デュアルテーマ(CSS variables 方式)
   - `unknownLanguage: error | warning | plain-text`(既定 warning)
   - ハイライターのシングルトン管理・言語の遅延読込
   - コードブロックメタ(`title=`, 行ハイライト)は **パースだけ実装し、レンダリングは Phase 4**(MVP はコピー ボタン用のクラス付与まで)
6. 内部リンク変換 (`markdown/links`)
   - `./guides/configuration.md` → `/guides/configuration/` 変換(rehype プラグインとして実装)
   - ロケール内解決、`basePath` はランタイム側で付与するため生成データはロケール相対
   - リンク解決結果を「未解決リンク一覧」として収集(Phase 5 の検証で使用)
7. ページモデル出力 (`core/pages`)
   - `GeneratedPage`(仕様 §23)を `.makit/generated/pages/{locale}/{pageId}.json` に書き出し
   - `manifest.json`(全ページの route/segments/locale/pageId 索引)、`site.json`(解決済み設定のサブセット)、`locales.json`
8. テスト: fixture ベースの変換スナップショットテスト(GFM、脚注、コード、リンク変換、front matter バリエーション)

### Phase 3: 国際化 — 翻訳対応付け + フォールバック

**ゴール: ロケール別ページ対応・フォールバックページ生成が JSON レベルで完結する**

1. I18n Resolver (`core/i18n`)
   - 翻訳対応付けの優先順位: ① front matter `id` → ② 正規化相対ルート → ③ 相対ファイルパス
   - ページグループ(同一 pageId の翻訳集合)の構築
2. フォールバック生成
   - `fallback.enabled` / `behavior: render | redirect | not-found`(既定 render)
   - `render`: 対象ロケールの URL + デフォルトロケールの本文で `GeneratedPage` を複製(`isFallback: true`, `contentLocale`, `fallbackSource` を設定)
   - `redirect`: meta refresh + リンクの静的 HTML 用ページデータ生成
   - `not-found`: ページを生成しない
   - フォールバック通知メッセージ: `i18n.messages` のロケール別上書き、既定メッセージ内蔵
3. Navigation Generator (`core/navigation`)
   - `mode: "auto"`: ディレクトリ構造 + title + order + hidden から生成、`includeFallbackPages`(既定 true)
   - `mode: "manual"`: `navigation.locales` の定義を検証(リンク先存在チェック)、href へのロケール付与はランタイム側
   - `.makit/generated/navigation/{locale}.json` に出力
4. ルート URL 動作 (`root.behavior`): `default` / `detect` / `select` のデータ生成(実装は Phase 4 のランタイム)
5. テスト: 翻訳対応付け(id 一致 / ルート一致 / 欠損)、フォールバック 3 方式、ナビ生成のスナップショット

### Phase 4: Next.js アプリ生成 + ランタイム + 標準テーマ

**ゴール: `makit build` で dist/ に静的サイトが出る + `makit dev` でプレビューできる**

1. `.makit/` Generator (`core/app-generator`)
   - `.makit/app/` の scaffold(layout.tsx / page.tsx / not-found.tsx / `[locale]/layout.tsx` / `[locale]/[[...slug]]/page.tsx`)
   - テンプレートは makit パッケージ内に同梱し、毎回上書き生成(再生成可能性の保証)
   - `next.config.mjs`(`output: "export"`, `trailingSlash`, `basePath`, `images.unoptimized: true`)
   - `.makit/package.json` / `tsconfig.json` の生成、makit-runtime への依存解決
   - `publicDir` → `.makit/public/` 同期(コピー or リンク)
   - カスタム CSS (`styles: []`) の取り込み(標準テーマの後に読込)
2. `makit-runtime` パッケージ
   - generated JSON の読込ヘルパー(`getPage`, `getManifest`, `getNavigation`)
   - `generateStaticParams` 相当のロジック(manifest から全ロケール × slug を列挙)
   - Next.js `generateMetadata` 生成: title テンプレート、description、canonical(フォールバックはコンテンツ元へ)、OGP / Twitter Card、robots(noindex/nofollow)、hreflang(実在する翻訳のみ + x-default)
   - `lang` / `dir` 属性の設定
3. 標準テーマ(コンポーネント + Tailwind CSS)
   - レイアウト: ヘッダー / サイドバー(ナビゲーション)/ 本文 / ページ内 ToC / フッター
   - モバイルナビゲーション(ハンバーガー)
   - ライト・ダークモード(`colorScheme: light | dark | system`、FOUC 防止のインラインスクリプト)
   - CSS Variables(`--makit-color-accent` など)+ `accentColor` / `radius` の反映
   - コードブロック: コピー ボタン、Shiki デュアルテーマ切替
   - 前後ページリンク(ナビゲーション順序から導出)
   - フォールバック通知バナー
   - 言語切り替え(同一 pageId の翻訳へ遷移、欠損時は `missingPage: fallback | locale-root | disabled`)
   - ルート `/` ページ: `default`(静的遷移)/ `detect`(クライアント言語検出 + localStorage)/ `select`(選択ページ、noscript リンク付き)
   - 404 ページ
   - Tailwind は `.makit/` 内で完結させる(利用者に設定を要求しない)
4. Build Orchestrator (`core/build`)
   - パイプライン統合: 設定読込 → 検証 → スキャン → 解析 → i18n → ナビ → `.makit/` 生成 → `next build` 実行(子プロセス)→ 成果物を `outDir` へ移動
   - `--clean` / `--no-clean`、`--strict`
   - draft ページの本番除外(dev では表示 + ドラフトバッジ)
   - サイトマップ生成(`sitemap.enabled`、alternate 関連付け、fallback / draft / noindex 除外)
   - ビルドサマリーログ(仕様 §32 の形式)
5. `makit dev`
   - 初回フルパイプライン実行 → `next dev` を `.makit/` で起動(ポート・ホスト・open)
   - chokidar で監視: Markdown / `makit.config.*` / publicDir / カスタム CSS
   - 変更ハンドリング(MVP は仕様許容どおり全ページ再生成でよいが、単一 Markdown 変更は対象ページのみ再生成を目標)
   - 設定変更時はフル再生成
6. `makit preview` — `outDir` を静的配信(trailingSlash / basePath / 404 対応)
7. `makit clean` — `.makit/` + `outDir` 削除、`--cache-only` / `--generated-only` / `--all`
8. E2E テスト: examples/basic をビルドして dist/ の HTML をアサート(ルート存在、hreflang、canonical、フォールバック、ナビ)

### Phase 5: 検証 (`makit check`) + Strict Mode + キャッシュ

**ゴール: CI で品質検証が回る + ビルドが高速化される**

1. Link Validator (`core/validation`)
   - 内部リンク: 存在しないページ / アンカー / 画像、draft への本番リンク、外部 URL の形式検証(疎通確認はしない)
   - ロケール跨ぎの不正相対リンク検出
2. 診断システム
   - 診断コード体系: `duplicate-route`, `duplicate-page-id`, `broken-link`, `missing-title`, `missing-translation`, `unknown-language`, `missing-asset`, ...
   - エラー / 警告の分類(仕様 §31.1 / §31.2)
   - `validation.strict` + `validation.failOn: [...]` による警告→エラー昇格
   - pretty / json 両形式での診断出力、CI 用終了コード
3. `makit check` — ビルドなしでパイプライン前半(スキャン〜検証)のみ実行
4. キャッシュ (`core/cache`)
   - `.makit/cache/` にページ単位の変換結果を保存
   - キャッシュキー: ソースハッシュ + front matter + Makit バージョン + 設定ハッシュ + プラグイン/Shiki/テーマ/ロケール設定
   - 設定変更時の全無効化、`clean --cache-only`
5. 検索索引データ生成(`.makit/generated/search/{locale}.json`)— UI は作らない、データのみ(仕様 §28)

### Phase 6: 仕上げ — ドキュメント + リリース準備

1. README(英語)+ examples/basic の充実(Makit 自身のドキュメントを Makit で書く dogfooding)
2. 受け入れ基準(仕様 §39 の 20 項目)のチェックリスト検証 — E2E テストとして自動化
3. CI (GitHub Actions): lint / typecheck / unit / e2e、Node 20/22 マトリクス
4. changesets によるバージョン管理、npm publish のドライラン
5. LICENSE (MIT)、CONTRIBUTING.md

---

## 3. モジュール依存関係

```text
config  ←──────────┐
  ↓                │
scanner → frontmatter → routes → i18n → navigation
  ↓                       ↓        ↓        ↓
markdown pipeline ────→ pages → validation
                          ↓
                    app-generator → next build → dist/
                          ↑
                  makit-runtime (React / theme)
```

- `core` は React / Next.js に依存しない(Node のみで単体テスト可能)
- `makit-runtime` は generated JSON のみに依存(Markdown 処理を含まない)— 仕様 §40.2
- CLI は core のオーケストレーションのみ行う

---

## 4. 主要な設計判断(仕様 §40 の再確認)

1. **`.makit/` は完全に再生成可能** — テンプレート同梱 + 毎回上書き。手動編集は保証しない
2. **Markdown 処理は Core で事前実行** — Next.js は JSON を表示するだけ
3. **フォールバックはビルド時に静的生成** — ランタイム分岐なし
4. **pageId が翻訳の同一性の根拠** — URL / ファイル名に依存しない
5. **Next.js 設定は非公開** — 利用者へは `MakitConfig` のみ公開
6. **dist/ は自己完結** — Node / Makit なしで配信可能(相対 or basePath 解決のみ)

---

## 5. リスクと対策

| リスク | 対策 |
| --- | --- |
| Next.js の `.makit/` からの依存解決(利用者の node_modules に next がない) | makit の dependencies に next/react を含め、`.makit/next.config.mjs` から `require.resolve` で解決。examples で早期検証(Phase 4 冒頭で spike) |
| Tailwind v4 のビルドを `.makit/` に閉じ込める複雑さ | 標準テーマ CSS を **事前ビルド済み CSS として runtime に同梱**する案をまず検討(利用者側で Tailwind ビルド不要になる) |
| `makit dev` の watch → Next.js 再読込の整合性 | generated JSON の変更を Next.js が拾う仕組み(dev では fs 読込 + ルーター再検証)を Phase 4 で spike |
| TS 設定ファイル読込の互換性 (ESM/CJS) | jiti を採用し、makit 自体は ESM-only で公開 |
| Shiki の全言語ロードによる起動遅延 | 遅延読込 + 使用言語検出を Phase 5 のキャッシュと合わせて最適化 |

---

## 6. マイルストーン(受け入れ基準との対応)

| Phase | 完了時に満たす受け入れ基準 (§39) |
| --- | --- |
| 1 | 1 (init) |
| 2 | 10 (remark プラグイン), 11 (Shiki), 14 (重複ルート検出) ※JSON レベル |
| 3 | 6, 7, 9 (フォールバック / pageId 対応) ※JSON レベル |
| 4 | 2, 3, 4, 5, 8, 12, 13, 16, 17, 18, 19 (dev / build / テーマ / SEO) |
| 5 | 15, 20 (リンク検証 / CI) |
| 6 | 全 20 項目の E2E 自動検証 |
