# 固定ページ（Static Pages）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `pages/` 配下の `.tsx` / `.jsx` / `.html` を、Makit の route map に載る固定ページとして出力できるようにする。

**Architecture:** CLI（`packages/makit`）が `pages/` を走査し、`GeneratedStaticPage` JSON と route map の `static` エントリを生成する。TSX は `.makit/app/static-pages.js` の静的 import に変換する。生成アプリの `[[...slug]]` は `static` エントリを新しい Page Slot `StaticPage`（`packages/makit-runtime`）で描画し、中身は `children` として渡す。

**Tech Stack:** TypeScript, Next.js 16 App Router (static export), React 19, unified / rehype, zod, jiti, chokidar, vitest

**Spec:** `docs/07-STATIC-PAGES.md`（以下「spec」。既存の `docs/01-SPECIFICATION.md` は「main spec」、`docs/05-THEME.md` は「THEME」）

## Global Constraints

- 既定ディレクトリは `"pages"`。`staticPages.dir: false` で機能全体を無効化する（spec §13）
- 対象拡張子は `.tsx` / `.jsx` / `.html` のみ。`_` で始まるファイル・ディレクトリ、ドットファイル、`node_modules/`、`.meta.ts` は固定ページとして扱わない（spec §4）
- 順序プレフィックスと Route Group は解釈しない（spec §5.1）
- ロケール接尾辞は i18n 有効時のみ解釈する。判定規則は spec §16 末尾のとおり（urlLocale と一致 → ロケール別、`/^[a-z]{2,3}-[a-z0-9]{2,8}$/i` だが不一致 → `static-page-unknown-locale`、それ以外 → ID の一部）
- メタデータの既定値: `layout: "default"`, `search: false`, `draft: false`, `noindex: false`, `nofollow: false`（spec §9.2）
- エラーコード: `static-page-ambiguous-file`, `static-page-route-conflict`, `static-page-home-conflict`, `static-page-unknown-locale`, `static-page-invalid-dir`
- 警告コード: `static-page-missing-title`, `static-page-html-document`, `static-page-locale-metadata`（`validation.failOn` で昇格可能）
- 生成データのパス: `.makit/generated/static-pages/{urlLocale}/{id}.json`（spec §12.2）
- route map のエントリ: `{ kind: "static"; id: string; route: string }`（spec §12.1）
- 固定ページは `llms.txt` / Markdown エンドポイント / ナビゲーションの対象外（spec §12.6）
- テストは `/opt/homebrew/bin/pnpm`（このシェルでは shim の `pnpm` が壊れている）で実行する。`makit` のテストは `makit-runtime` の `dist` を読むため、runtime を変更したタスクの後は `pnpm --filter @natsuneko-laboratory/makit-runtime build` を先に実行する
- コメントの密度と書き方は周辺コードに合わせる（spec / main spec のセクション番号を参照するスタイル）

## Review Focus

1. **ロケールなし URL `/pricing/`（i18n 有効時）** → ロケールゲートウェイが固定ページの各ロケール版へ案内する。テストは Task 9
2. **`makit dev` 中に固定ページを削除** → `static-pages.js` から import が消え、`static-pages/` の JSON も削除される（残ると Turbopack が存在しないファイルの import で落ちる）。テストは Task 6 と Task 7
3. **i18n 有効で `pages/index.tsx` がトップ** → ルート `/` のロケール選択ゲートウェイ（`RootPage`）が、各ロケールの固定ページトップ（`/en-us/` など）へリンクする（`getHomeRoute` の `static` 分岐）。確認は Task 11 Step 4
4. **HTML 断片のプロトコル相対 URL（`//cdn.example.com/a.js`）と `srcset`** → 書き換えない。テストは Task 4
5. **`build.trailingSlash: false` + `basePath`** → route が `/docs/pricing` になる（末尾スラッシュなし）。サイトトップは `/docs` になる。テストは Task 3

---

## File Structure

`packages/makit`（CLI）

| ファイル                                                                                                    | 責務                                                           |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `src/types/static-page.ts`（新規）                                                                          | `GeneratedStaticPage` 型                                       |
| `src/types/config.ts` / `src/types/resolved-config.ts` / `src/config/schema.ts` / `src/config/normalize.ts` | `staticPages` 設定、診断コード                                 |
| `src/core/errors.ts`                                                                                        | エラーコード追加                                               |
| `src/metadata/types.ts` / `define.ts` / `loader.ts` / `index.ts`                                            | `StaticPageMetadata`、`defineStaticPageMetadata`               |
| `src/testing/fixtures.ts`                                                                                   | `staticPageMetaSource`                                         |
| `src/core/static-page-sources.ts`（新規）                                                                   | `pages/` の走査とロケール解決（ファイル → URL）                |
| `src/core/static-page-html.ts`（新規）                                                                      | HTML 断片の前処理                                              |
| `src/core/static-pages.ts`（新規）                                                                          | メタデータ評価、`GeneratedStaticPage` の構築、ルート衝突の検査 |
| `src/core/generate.ts` / `search-index.ts` / `sitemap.ts`                                                   | 生成データ、検索、sitemap への組み込み                         |
| `src/core/app-generator/templates.ts` / `index.ts`                                                          | `static-pages.js`、`[[...slug]]` の分岐、Tailwind `@source`    |
| `src/core/build.ts` / `dev.ts` / `check.ts`                                                                 | パイプラインへの組み込み                                       |

`packages/makit-runtime`（生成アプリ）

| ファイル                                                      | 責務                                         |
| ------------------------------------------------------------- | -------------------------------------------- |
| `src/data/types.ts` / `paths.ts` / `loaders.ts`               | 型、`getStaticPage`、`static` エントリの扱い |
| `src/i18n/locale-alias.ts`                                    | ゲートウェイの `static` 対応                 |
| `src/i18n/static-page-locale-links.ts`（新規）                | 固定ページの言語切替リンクの算出（純関数）   |
| `src/metadata/build-metadata.ts`                              | `buildStaticPageMetadata`                    |
| `src/components/header-actions.tsx`（新規）                   | Header actions の共通化（spec §10.3）        |
| `src/components/locale-links.tsx`（新規）                     | Portal と StaticPage で共有する言語リンク列  |
| `src/components/static-page.tsx`（新規）                      | `StaticPage` Slot の既定実装                 |
| `src/theme/slot-names.ts` / `components.tsx` / `src/index.ts` | Slot 登録、公開 API                          |

その他: `examples/static-pages/`（新規）、`docs/01-SPECIFICATION.md`、`docs/05-THEME.md`、`README.md`

---

### Task 1: 設定・診断コード

**Files:**

- Modify: `packages/makit/src/types/config.ts`（`MakitConfig` に `staticPages?: StaticPagesConfig`、`StaticPagesConfig` を spec §13 のとおり追加。`MakitWarningCode` に警告 3 種を追加）
- Modify: `packages/makit/src/types/resolved-config.ts`（`ResolvedConfig` に `staticPages: { dir: string | false }`）
- Modify: `packages/makit/src/config/schema.ts`（`staticPages: z.strictObject({ dir: z.union([z.string().min(1), z.literal(false)]).optional() }).optional()`。`warningCodeSchema` に警告 3 種を追加）
- Modify: `packages/makit/src/config/defaults.ts`（`DEFAULT_STATIC_PAGES_DIR = "pages"`）
- Modify: `packages/makit/src/config/normalize.ts`
- Modify: `packages/makit/src/core/errors.ts`（エラー 5 種を `MakitErrorCode` に追加）
- Test: `packages/makit/src/config/normalize.test.ts`, `packages/makit/src/config/schema.test.ts`

**Interfaces:**

- Produces: `config.staticPages.dir: string | false`（プロジェクトルート相対）。以降のタスクは `join(config.root, dir)` で絶対パスにする

- [ ] **Step 1: 失敗するテストを書く**

`normalize.test.ts` に `describe("staticPages (STATIC-PAGES §13)")` を追加する。

- `resolveConfig({ title: "T" }, ctx).staticPages` が `{ dir: "pages" }`
- `staticPages: { dir: false }` → `{ dir: false }`
- `staticPages: { dir: "docs/pages" }`（既定 `sourceDir: "docs"` の入れ子）→ `MakitError` で `code === "static-page-invalid-dir"`
- `staticPages: { dir: "public" }` / `{ dir: "theme" }` / `{ dir: "dist" }`（outDir と同一）→ いずれも `static-page-invalid-dir`
- `staticPages: { dir: "." }`（他ディレクトリを内包する）→ `static-page-invalid-dir`

`schema.test.ts`: `validation.failOn: ["static-page-missing-title"]` が受理され、`staticPages: { dir: 1 }` が拒否される。

- [ ] **Step 2: 失敗を確認する**

Run: `/opt/homebrew/bin/pnpm --filter @natsuneko-laboratory/makit exec vitest run src/config`
Expected: 上記のテストが FAIL

- [ ] **Step 3: 実装する**

`resolveConfig` で `staticPages.dir` を解決し、`false` 以外なら次の各ディレクトリと比較する。

- 各ロケールの `sourceDir`、`publicDir`、`outDir`
- `theme.dir`（`false` 以外の場合）

比較は「同一」と「どちらかがもう一方の内側」の両方向で行い、どちらかに当てはまれば `MakitError("static-page-invalid-dir", ...)` を投げる。判定は `path.relative` で行い、`""` または `..` で始まらない相対パスを入れ子とみなす。

- [ ] **Step 4: テストが通ることを確認する**

Run: `/opt/homebrew/bin/pnpm --filter @natsuneko-laboratory/makit exec vitest run src/config`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/makit/src/types packages/makit/src/config packages/makit/src/core/errors.ts
git commit -m "feat(config): add staticPages.dir and static page diagnostic codes"
```

---

### Task 2: 固定ページのメタデータ定義

**Files:**

- Modify: `packages/makit/src/metadata/types.ts`（spec §9.2 の `StaticPageMetadata`、`StaticPageLayout = "default" | "bare"`）
- Modify: `packages/makit/src/metadata/define.ts`（`MetadataKind` に `"static-page"`、`defineStaticPageMetadata`）
- Modify: `packages/makit/src/metadata/loader.ts`（`DEFINE_FUNCTION_BY_KIND["static-page"] = "defineStaticPageMetadata"`）
- Modify: `packages/makit/src/metadata/index.ts`（`defineStaticPageMetadata`、`StaticPageMetadata`、`StaticPageLayout` を export）
- Modify: `packages/makit/src/testing/fixtures.ts`（`staticPageMetaSource(metadata: StaticPageMetadata): string`。`pageMetaSource` と同じ形）
- Test: `packages/makit/src/metadata/define.test.ts`, `packages/makit/src/metadata/loader.test.ts`

**Interfaces:**

- Produces: `defineStaticPageMetadata(metadata: StaticPageMetadata): StaticPageMetadata`
- Produces: `loadMetadataFile<StaticPageMetadata>(path, "static-page", options)`
- Produces: `staticPageMetaSource(metadata): string`（テスト用）

- [ ] **Step 1: 失敗するテストを書く**

- `define.test.ts`: `getMetadataKind(defineStaticPageMetadata({ title: "x" })) === "static-page"`
- `loader.test.ts`:
  - `staticPageMetaSource({ title: "Pricing", layout: "bare" })` を書いたファイルを `"static-page"` で読むと値が返る
  - `pageMetaSource(...)` のファイルを `"static-page"` で読むと `metadata-wrong-define-function` になり、メッセージに `defineStaticPageMetadata` を含む

- [ ] **Step 2: 失敗を確認する**

Run: `/opt/homebrew/bin/pnpm --filter @natsuneko-laboratory/makit exec vitest run src/metadata`
Expected: FAIL

- [ ] **Step 3: 実装する**（既存の `brand` を使う）

- [ ] **Step 4: テストが通ることを確認する**

Run: 同上
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/makit/src/metadata packages/makit/src/testing/fixtures.ts
git commit -m "feat(metadata): add defineStaticPageMetadata"
```

---

### Task 3: `pages/` の走査とロケール解決

**Files:**

- Create: `packages/makit/src/core/static-page-sources.ts`
- Test: `packages/makit/src/core/static-page-sources.test.ts`

**Interfaces:**

- Consumes: `config.staticPages.dir`（Task 1）、`buildRoute`（`core/routes.ts`）
- Produces:

```ts
export interface StaticPageSource {
  /** Static Page ID — path below `pages/` without extension or locale suffix (spec §2). */
  id: string;
  /** Path below `pages/` without extension, locale suffix kept — the `static-pages.js` key. */
  componentKey: string;
  absolutePath: string;
  kind: "component" | "html";
  /** urlLocale of a locale-specific file (spec §6); undefined for the shared file. */
  localeSuffix?: string;
  /** Absolute path of `<dir>/<basename-of-id>.meta.ts`, when it exists. */
  metadataPath?: string;
}

export interface ScanStaticPageSourcesResult {
  sources: StaticPageSource[];
  /** `static-page-locale-metadata` warnings. */
  diagnostics: Diagnostic[];
}

export async function scanStaticPageSources(
  config: ResolvedConfig,
): Promise<ScanStaticPageSourcesResult>;

/** One source chosen for one locale (spec §6 resolution rules). */
export interface LocalizedStaticPageSource {
  source: StaticPageSource;
  locale: ResolvedLocaleConfig;
  /** URL segments below the locale prefix (`index` dropped). */
  segments: string[];
  route: string;
}

export function resolveStaticPageLocales(
  sources: readonly StaticPageSource[],
  config: ResolvedConfig,
): LocalizedStaticPageSource[];
```

- [ ] **Step 1: 失敗するテストを書く**

一時ディレクトリに fixture を作る書き方は `generate.test.ts` に揃える。

- `scanStaticPageSources`
  - `pages/pricing.tsx`, `pages/company/about.html`, `pages/index.jsx` → id `pricing` / `company/about` / `index`、kind `component` / `html` / `component`
  - `pages/_components/hero.tsx`, `pages/_util.tsx`, `pages/.hidden.tsx`, `pages/notes.md`, `pages/pricing.meta.ts` は sources に含まれない
  - `pages/pricing.meta.ts` があると `pricing` の `metadataPath` がその絶対パス
  - `staticPages.dir: false` または `pages/` 不在 → `{ sources: [], diagnostics: [] }`
  - i18n（en-US / ja-JP）有効時
    - `about.ja-jp.html` → id `about`、`localeSuffix: "ja-jp"`、`componentKey: "about.ja-jp"`
    - `about.JA-JP.html` も同じ扱いになる（大文字小文字を区別しない）
    - `about.fr-fr.html` → `MakitError` `static-page-unknown-locale`
    - `pricing.v2.tsx` / `about.old.tsx` → id `pricing.v2` / `about.old`
    - `about.ja-jp.meta.ts` → `static-page-locale-metadata` 警告（`sourcePath` 付き）
  - i18n 無効時: `about.ja-jp.html` → id `about.ja-jp`、`localeSuffix` なし
  - `about.tsx` と `about.html` → `static-page-ambiguous-file`
  - `about.ja-jp.tsx` と `about.ja-jp.html` → `static-page-ambiguous-file`
  - `about.tsx` と `about.ja-jp.html` → エラーにならない
- `resolveStaticPageLocales`
  - i18n 有効時、`about.html` + `about.ja-jp.html` → en-us は `about.html`、ja-jp は `about.ja-jp.html`。route は `/en-us/about/` と `/ja-jp/about/`
  - `contact.ja-jp.html` のみ → ja-jp にだけ存在する
  - `index.tsx` → segments `[]`、route `/en-us/`。`company/index.tsx` → segments `["company"]`
  - i18n 無効 + `basePath: "/docs"` + `build.trailingSlash: false` → `pricing` の route が `/docs/pricing`、`index` の route が `/docs`（Review Focus 5）

- [ ] **Step 2: 失敗を確認する**

Run: `/opt/homebrew/bin/pnpm --filter @natsuneko-laboratory/makit exec vitest run src/core/static-page-sources.test.ts`
Expected: FAIL（モジュールがない）

- [ ] **Step 3: 実装する**

- 走査は `fast-glob`（`["**/*.{tsx,jsx,html}"]`, `dot: false`, `ignore: ["**/node_modules/**", "**/_*/**", "**/_*"]`）
- `.meta.ts` は別の glob で拾い、警告の判定と `metadataPath` の割り当てに使う
- 接尾辞の判定は spec §16 末尾の規則に従う
- route は `buildRoute(segments, { basePath, localePrefix: i18n.enabled ? urlLocale : undefined, trailingSlash })`

- [ ] **Step 4: テストが通ることを確認する**

Run: 同上
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/makit/src/core/static-page-sources.ts packages/makit/src/core/static-page-sources.test.ts
git commit -m "feat(static-pages): scan pages/ and resolve per-locale sources"
```

---

### Task 4: HTML 断片の前処理

**Files:**

- Modify: `packages/makit/package.json`（dependencies に `rehype-parse`。`unified` / `rehype-stringify` と同じメジャー系列を `pnpm add` で入れる）
- Create: `packages/makit/src/core/static-page-html.ts`
- Test: `packages/makit/src/core/static-page-html.test.ts`

**Interfaces:**

- Produces:

```ts
export interface ProcessedStaticPageHtml {
  html: string;
  /** Source contained `<!doctype>`, `<html>`, `<head>` or `<body>` (spec §8.1). */
  isDocument: boolean;
}
export function processStaticPageHtml(source: string, basePath: string): ProcessedStaticPageHtml;
```

- [ ] **Step 1: 失敗するテストを書く**

以下は `basePath = "/docs"` の場合。

- `<a href="/pricing/">` → `href="/docs/pricing/"`
- `<img src="/og.png">` → `src="/docs/og.png"`
- `<a href="./a/">`, `<a href="https://x.dev/">`, `<a href="#top">`, `<a href="mailto:a@b">` は変更しない
- `<script src="//cdn.example.com/a.js">` と `<img srcset="/a.png 1x">` は変更しない（Review Focus 4）
- `basePath = ""` のときは何も変えない。`isDocument` は `false`
- `<!doctype html><html><head><title>x</title></head><body><p>hi</p></body></html>` → `html` が `<p>hi</p>`（`<title>` を含まない）で、`isDocument: true`
- `<section class="a">x</section>` は属性も含めて保持される

- [ ] **Step 2: 失敗を確認する**

Run: `/opt/homebrew/bin/pnpm --filter @natsuneko-laboratory/makit exec vitest run src/core/static-page-html.test.ts`
Expected: FAIL

- [ ] **Step 3: 実装する**

- `isDocument` は `/<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i` で判定する
- 文書なら `rehypeParse({ fragment: false })` で解析し、`body` 要素の children を root に置き換える。断片なら `fragment: true` で解析する
- `unist-util-visit` で `href` / `src` を書き換え、`rehype-stringify` で出力する。`processSync` を使う

- [ ] **Step 4: テストが通ることを確認する**

Run: 同上
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/makit/package.json pnpm-lock.yaml packages/makit/src/core/static-page-html.ts packages/makit/src/core/static-page-html.test.ts
git commit -m "feat(static-pages): process HTML fragments and prefix basePath"
```

---

### Task 5: `GeneratedStaticPage` の構築とルート衝突の検査

**Files:**

- Create: `packages/makit/src/types/static-page.ts`（spec §12.2 の `GeneratedStaticPage`。`metadata` は `types/page.ts` の `GeneratedMetadata`）
- Create: `packages/makit/src/core/static-pages.ts`
- Test: `packages/makit/src/core/static-pages.test.ts`

**Interfaces:**

- Consumes: Task 2〜4 の全関数、`localizeValue`（`core/localize.ts`）、`MetadataCache`、`metadataLoadDiagnostics`
- Produces:

```ts
export interface BuildStaticPagesOptions {
  jiti?: Jiti;
  metadataCache?: MetadataCache;
  /** `makit dev` keeps drafts (spec §15); `build`/`check` pass false. */
  includeDrafts: boolean;
}
export interface BuildStaticPagesResult {
  staticPages: GeneratedStaticPage[];
  diagnostics: Diagnostic[];
  /** `.meta.ts` files and their local dependencies, for the dev metadata watcher. */
  watchPaths: string[];
}
export async function buildStaticPages(
  config: ResolvedConfig,
  options: BuildStaticPagesOptions,
): Promise<BuildStaticPagesResult>;

/** Throws `static-page-route-conflict` / `static-page-home-conflict` (spec §14, §16). */
export function assertStaticPageRoutes(
  staticPages: readonly GeneratedStaticPage[],
  pages: readonly GeneratedPage[],
  config: ResolvedConfig,
): void;
```

- [ ] **Step 1: 失敗するテストを書く**

- `staticPageMetaSource({ title: { "en-US": "Pricing", "ja-JP": "料金" }, description: "d", layout: "bare", search: true, image: "/og.png", noindex: true })` を持つ `pricing.tsx`（i18n 有効）
  - en-us の title が `Pricing`、ja-jp が `料金`
  - `layout: "bare"`, `search: true`, `kind: "component"`, `componentKey: "pricing"`, `html` が undefined
  - `metadata.image === "/og.png"`, `metadata.noindex === true`
- 既定値: `.meta.ts` のない `about.html`（`<p>a</p>`）
  - `layout: "default"`, `search: false`, `draft: false`, `kind: "html"`, `html` が `<p>a</p>`
  - title が `about` で、`static-page-missing-title` 警告が 1 件
- タイトルのフォールバック（spec §9.4）
  - `company/index.tsx` → `company`
  - ルートの `index.tsx` → `config.title`
- `<html>` を含む HTML → `static-page-html-document` 警告
- `alternates`: `about.html` + `about.ja-jp.html` → en-us の alternates に `{ urlLocale: "ja-jp", hreflang: "ja-JP", href: "/ja-jp/about/" }` があり、自分自身は含まない
- draft の扱い（`about.html` + `about.ja-jp.html`、`about.meta.ts` が `{ draft: true }`、別途 `contact.html`）
  - `includeDrafts: false` → `about` はどのロケールにも存在せず、`contact` だけが返る
  - `includeDrafts: true` → `about` が両ロケールに `draft: true` で返り、互いの alternates に載る
- `watchPaths` に `pricing.meta.ts` が含まれる
- `assertStaticPageRoutes`
  - Markdown `docs/pricing.md` と `pages/pricing.tsx` → `static-page-route-conflict`
  - `pages/company.tsx` と `pages/company/index.tsx` → `static-page-route-conflict`
  - `pages/index.tsx` + `home: { layout: "portal" }` → `static-page-home-conflict`
  - `pages/index.tsx` + Markdown `docs/index.md` → `static-page-route-conflict`
  - `pages/index.tsx` だけ（home 未設定、Markdown のルートページなし）→ 例外なし

- [ ] **Step 2: 失敗を確認する**

Run: `/opt/homebrew/bin/pnpm --filter @natsuneko-laboratory/makit exec vitest run src/core/static-pages.test.ts`
Expected: FAIL

- [ ] **Step 3: 実装する**

- ID ごとに `.meta.ts` を 1 回だけ評価する（ロケール間で共有）
- alternates は draft を除外した後の集合から作る
- 衝突の検出キーは `${locale}:${segments.join("/")}`

- [ ] **Step 4: テストが通ることを確認する**

Run: 同上
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/makit/src/types/static-page.ts packages/makit/src/core/static-pages.ts packages/makit/src/core/static-pages.test.ts
git commit -m "feat(static-pages): build GeneratedStaticPage and detect route conflicts"
```

---

### Task 6: 生成データ・検索・sitemap への組み込み

**Files:**

- Modify: `packages/makit/src/core/generate.ts`
- Modify: `packages/makit/src/core/search-index.ts`
- Modify: `packages/makit/src/core/sitemap.ts`
- Test: `packages/makit/src/core/generate.test.ts`, `packages/makit/src/core/search-index.test.ts`, Create: `packages/makit/src/core/sitemap.test.ts`

**Interfaces:**

- Consumes: `GeneratedStaticPage`（Task 5）
- Produces（既存のシグネチャを後方互換に拡張する）:
  - `writeGeneratedData(config, pages, collections, navigationByLocale = {}, staticPages: readonly GeneratedStaticPage[] = [])`
  - `buildSearchIndex(pages, staticPages: readonly GeneratedStaticPage[] = [])`
  - `generateSitemapXml(pages, config, staticPages: readonly GeneratedStaticPage[] = [])`
  - `generate.ts` の `RouteMapEntry` に `{ kind: "static"; id: string; route: string }` を追加

- [ ] **Step 1: 失敗するテストを書く**

- `generate.test.ts`
  - `pricing` の静的ページを渡す → `static-pages/en/pricing.json`（i18n 無効時の urlLocale は `en`）が書かれ、route-map の `["en"]["pricing"]` が `{ kind: "static", id: "pricing", route: "/pricing/" }`
  - `index` の静的ページがあるロケールでは `resolveHome` を行わない
    - route-map の `""` が `static` になる
    - collection が複数あっても `home/{locale}.json` が書かれない
  - 2 回目の `writeGeneratedData` で静的ページを渡さないと、`static-pages/en/pricing.json` が消える（Review Focus 2、既存の `pruneStale` に乗っていることの確認）
- `search-index.test.ts`
  - `search: true` の静的ページが `{ pageId: "static:pricing", title, route, locale, headings: [], content: description ?? "" }` として入る
  - `search: false` は入らない
- `sitemap.test.ts`
  - 静的ページの `<loc>` と `xhtml:link` が出力される
  - `metadata.noindex: true` と `draft: true` は出力されない

- [ ] **Step 2: 失敗を確認する**

Run: `/opt/homebrew/bin/pnpm --filter @natsuneko-laboratory/makit exec vitest run src/core/generate.test.ts src/core/search-index.test.ts src/core/sitemap.test.ts`
Expected: FAIL

- [ ] **Step 3: 実装する**

`writeGeneratedData` は次の順で route map を作る。

1. Markdown ページの登録（既存）
2. 静的ページの登録
3. home ループ（静的ページで `""` が埋まったロケールは skip）

- [ ] **Step 4: テストが通ることを確認する**

Run: 同上
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/makit/src/core/generate.ts packages/makit/src/core/search-index.ts packages/makit/src/core/sitemap.ts packages/makit/src/core/*.test.ts
git commit -m "feat(static-pages): write static pages into generated data, search, and sitemap"
```

---

### Task 7: 生成アプリ（`static-pages.js`、`[[...slug]]`、Tailwind）

**Files:**

- Modify: `packages/makit/src/core/app-generator/templates.ts`
- Modify: `packages/makit/src/core/app-generator/index.ts`
- Test: `packages/makit/src/core/app-generator/templates.test.ts`

**Interfaces:**

- Consumes: `GeneratedStaticPage`（Task 5）。runtime から `getStaticPage(locale, id)` と `buildStaticPageMetadata(page, site)`（Task 9）を生成コードの文字列として参照する
- Produces:
  - `staticPagesModuleTemplate(staticPages: readonly GeneratedStaticPage[], appDir: string): string`
    - `kind === "component"` のページを `componentKey` で重複排除し、`componentKey` 順に並べる
    - `import StaticPage{n} from "<appDir からの相対パス>"` を出力し、`export const staticPageComponents = { "<componentKey>": StaticPage{n}, ... };` を export する
    - 0 件なら `export const staticPageComponents = {};`
  - `writeStaticPagesModule(config: ResolvedConfig, staticPages: readonly GeneratedStaticPage[]): Promise<void>`（`index.ts`。`.makit/app` を mkdir して `atomicWriteFile`）
  - `SlugPageTemplateOptions.staticPagesModulePath: string`（i18n 有効時 `"../../static-pages.js"`、無効時 `"../static-pages.js"`）
  - `GlobalsCssOptions.staticPageSources: string[]`

- [ ] **Step 1: 失敗するテストを書く**

- `staticPagesModuleTemplate`
  - 2 ページ（`pricing`、`pricing.ja-jp`）＋ html ページ 1 件 → import が 2 行で、キーが `"pricing"` と `"pricing.ja-jp"`。html ページの import はない
  - 空配列 → `export const staticPageComponents = {};`
  - パスは `slotRequest` と同じく `/` 区切りの相対指定子
  - 1 ページを除いて再生成すると、その import がなくなる（Review Focus 2）
- `slugPageTemplate`
  - 出力に `entry.kind === "static"` の分岐、`getStaticPage`、`buildStaticPageMetadata`、`themeComponents.StaticPage`、`staticPageComponents[page.componentKey]` を含む
  - HTML の場合は `dangerouslySetInnerHTML={{ __html: page.html }}` を含む
  - `import { staticPageComponents } from` に `staticPagesModulePath` が使われる
- `globalsCssTemplate({ ..., staticPageSources: ["/abs/pages/**/*.{tsx,jsx,ts,js,html}"] })` → `@source "/abs/pages/**/*.{tsx,jsx,ts,js,html}";` を含む。glob は `_` 配下を除外しない（`_components/` の Tailwind クラスもコンパイルされる）

- [ ] **Step 2: 失敗を確認する**

Run: `/opt/homebrew/bin/pnpm --filter @natsuneko-laboratory/makit exec vitest run src/core/app-generator`
Expected: FAIL

- [ ] **Step 3: 実装する**

- `slugPageTemplate` の生成コードは spec §12.3 のとおりにする。`generateMetadata` にも static 分岐を足す
- `generateApp`
  - `staticPages.dir` が `false` でなく存在する場合、`staticPageSources` に `<abs>/**/*.{tsx,jsx,ts,js,html}`（`/` 区切り）を渡す
  - 同じ条件で、`commonAncestorDir` の入力にそのディレクトリを加える

- [ ] **Step 4: テストが通ることを確認する**

Run: 同上
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/makit/src/core/app-generator
git commit -m "feat(static-pages): generate static-pages.js and route static entries"
```

---

### Task 8: build / dev / check への組み込み

**Files:**

- Modify: `packages/makit/src/core/build.ts`
- Modify: `packages/makit/src/core/dev.ts`
- Modify: `packages/makit/src/core/check.ts`
- Test: `packages/makit/src/core/check.test.ts`

**Interfaces:**

- Consumes: `buildStaticPages`, `assertStaticPageRoutes`（Task 5）、`writeGeneratedData` / `generateSitemapXml`（Task 6）、`writeStaticPagesModule`（Task 7）

- [ ] **Step 1: 失敗するテストを書く**

`check.test.ts`:

- `pages/about.html`（`.meta.ts` なし）→ `diagnostics` に `static-page-missing-title`
- `pages/index.tsx` + `home: { layout: "portal" }` → reject で `code === "static-page-home-conflict"`
- `docs/pricing.md` + `pages/pricing.tsx` → reject で `static-page-route-conflict`
- `CheckResult.staticPageCount` が固定ページ数（ロケール × ページ）

- [ ] **Step 2: 失敗を確認する**

Run: `/opt/homebrew/bin/pnpm --filter @natsuneko-laboratory/makit exec vitest run src/core/check.test.ts`
Expected: FAIL

- [ ] **Step 3: 実装する**

- `check.ts`
  - `decoratePagesWithNavigation` の後に `buildStaticPages(config, { jiti, metadataCache, includeDrafts: false })` → `assertStaticPageRoutes`
  - `resolveHome` ループは、`segments.length === 0` の静的ページを持つロケールで skip する
  - 静的ページの診断を `diagnostics` に加える
  - `CheckResult` に `staticPageCount: number` を追加する
- `build.ts`
  - 同じ位置で `buildStaticPages(..., { includeDrafts: false })` → `assertStaticPageRoutes` を行い、診断を `diagnostics` に加える（strict / failOn の昇格対象になる）
  - `writeGeneratedData(..., staticPages)` → `writeStaticPagesModule(config, staticPages)` → `generateApp`
  - `generateSitemapXml(allPages, config, staticPages)`
  - `logger.success` で固定ページ数も出す
- `dev.ts`
  - `regenerateContent`: `buildStaticPages(..., { includeDrafts: true })`、`assertStaticPageRoutes`、`writeGeneratedData(..., staticPages)`、`writeStaticPagesModule` を、`dev-refresh.js` を書く前に行う。返り値の watch パスに `watchPaths` を加える
  - 新しい `watchStaticPagesDir()`（`watchThemeDir` と同じ形）
    - `change` イベントで `.tsx` / `.jsx` なら無視する
    - それ以外は `runRegenerate()`
    - 起動時と `reloadConfig` で呼ぶ。`close` で閉じる

- [ ] **Step 4: テストが通ることを確認する**

Run: `/opt/homebrew/bin/pnpm --filter @natsuneko-laboratory/makit exec vitest run`
Expected: 全件 PASS（既存 458 件を含む）

- [ ] **Step 5: 型検査**

Run: `/opt/homebrew/bin/pnpm --filter @natsuneko-laboratory/makit typecheck`
Expected: エラーなし

- [ ] **Step 6: Commit**

```bash
git add packages/makit/src/core/build.ts packages/makit/src/core/dev.ts packages/makit/src/core/check.ts packages/makit/src/core/check.test.ts
git commit -m "feat(static-pages): wire static pages into build, dev, and check"
```

---

### Task 9: runtime のデータ層

**Files:**

- Modify: `packages/makit-runtime/src/data/types.ts`
  - `RouteMapEntry` に static を追加
  - `GeneratedStaticPage` / `StaticPageLayout` を追加（makit 側の Task 5 と同じ形）
  - `StaticPageComponentProps` を追加（spec §7.2）
- Modify: `packages/makit-runtime/src/data/paths.ts`（`staticPagePath(locale, id)` → `generated/static-pages/{locale}/{id}.json`）
- Modify: `packages/makit-runtime/src/data/loaders.ts`（`getStaticPage(locale: string, id: string): Promise<GeneratedStaticPage>`。`getHomeRoute` で `static` なら `entry.route`）
- Modify: `packages/makit-runtime/src/i18n/locale-alias.ts`（`static` なら `href = entry.route`）
- Modify: `packages/makit-runtime/src/metadata/build-metadata.ts`（`buildStaticPageMetadata(page: GeneratedStaticPage, site: SiteData): Metadata`）
- Modify: `packages/makit-runtime/src/index.ts`（上記を export）
- Test: `packages/makit-runtime/src/i18n/locale-alias.test.ts`, Create: `packages/makit-runtime/src/metadata/build-metadata.test.ts`

**Interfaces:**

- Produces: `getStaticPage`, `buildStaticPageMetadata`, 型 `GeneratedStaticPage`, `StaticPageComponentProps`

- [ ] **Step 1: 失敗するテストを書く**

- `locale-alias.test.ts`
  - routeMap の en-us / ja-jp に `pricing: { kind: "static", id: "pricing", route: "/en-us/pricing/" }`（ja-jp は `/ja-jp/pricing/`）を置く
  - `resolveLocaleAliasTargets(i18n, maps, ["pricing"])` が 2 件の href を返す
  - `collectLocaleAliasRoutes` に `["pricing"]` が含まれる（Review Focus 1）
- `build-metadata.test.ts`
  - title が `titleTemplate` 適用済み
  - description が page → site の順にフォールバックする
  - `robots.index === !noindex`
  - `alternates.canonical` が `metadata.canonical ?? route`
  - `alternates.languages` が alternates と自分自身（`page.locale` → `page.route`）
  - image が page → `site.seo.defaultImage` の順にフォールバックする

- [ ] **Step 2: 失敗を確認する**

Run: `/opt/homebrew/bin/pnpm --filter @natsuneko-laboratory/makit-runtime exec vitest run`
Expected: FAIL

- [ ] **Step 3: 実装する**

`buildPageMetadata` と共通の部分（title / openGraph / twitter の組み立て）は、モジュール内の非公開関数にまとめる。

- [ ] **Step 4: テストが通ることを確認する**

Run: 同上
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/makit-runtime/src
git commit -m "feat(runtime): load static pages and build their metadata"
```

---

### Task 10: `StaticPage` Slot と Header actions の共通化

**Files:**

- Create: `packages/makit-runtime/src/i18n/static-page-locale-links.ts`
- Create: `packages/makit-runtime/src/components/header-actions.tsx`
- Create: `packages/makit-runtime/src/components/locale-links.tsx`（`portal-home-page.tsx` のインラインの言語リンクを移す）
- Create: `packages/makit-runtime/src/components/static-page.tsx`
- Modify: `packages/makit-runtime/src/components/docs-page.tsx`, `portal-home-page.tsx`（`HeaderActions` を使う）
- Modify: `packages/makit-runtime/src/theme/slot-names.ts`（`THEME_PAGE_SLOT_NAMES` の `PortalHomePage` の直後に `"StaticPage"`。optional には入れない）
- Modify: `packages/makit-runtime/src/theme/components.tsx`（`ThemeComponents.StaticPage: ThemeSlotComponent<StaticPageProps>`、既定実装）
- Modify: `packages/makit-runtime/src/index.ts`（`StaticPage` と `StaticPageProps` を export）
- Test: Create `packages/makit-runtime/src/i18n/static-page-locale-links.test.ts`, Modify `packages/makit-runtime/src/theme/slot-names.test.ts`, `packages/makit-runtime/src/theme/components.test.ts`

**Interfaces:**

- Consumes: Task 9 の型とローダー
- Produces:

```ts
// i18n/static-page-locale-links.ts
export interface LocaleLink {
  locale: LocaleData;
  href: string;
  current: boolean;
}
export function resolveStaticPageLocaleLinks(
  page: GeneratedStaticPage,
  locales: readonly LocaleData[],
  homeRoutes: Readonly<Record<string, string | undefined>>,
): LocaleLink[];

// components/header-actions.tsx — SearchDialog, children, then ThemeToggle (colorScheme "system")
export interface HeaderActionsProps {
  site: SiteData;
  searchEntries: SearchEntry[];
  components: ThemeComponents;
  /** Rendered between the search dialog and the theme toggle. */
  children?: ReactNode;
}
export function HeaderActions(props: HeaderActionsProps): ReactNode;

// components/locale-links.tsx
export function LocaleLinks({ links }: { links: readonly LocaleLink[] }): ReactNode;

// components/static-page.tsx
export interface StaticPageProps {
  page: GeneratedStaticPage;
  site: SiteData;
  i18n: I18nData;
  locale: string;
  components: ThemeComponents;
  children: ReactNode;
}
export async function StaticPage(props: StaticPageProps): Promise<ReactNode>;
```

- [ ] **Step 1: 失敗するテストを書く**

- `static-page-locale-links.test.ts`（locales: en-us / ja-jp / fr-fr）
  - alternates に ja-jp がある → ja-jp の href が alternate の href
  - fr-fr に alternate がなく、`homeRoutes["fr-fr"] = "/fr-fr/"` → fr-fr の href が `/fr-fr/`
  - fr-fr の homeRoute が undefined → fr-fr は省略される
  - 自ロケールは `current: true` で `page.route`
  - 結果が 1 件以下なら `[]`
- `slot-names.test.ts`
  - `THEME_PAGE_SLOT_NAMES` に `StaticPage` が含まれる
  - `isOptionalThemeSlotName("StaticPage") === false`
  - `THEME_SLOT_NAME_BY_FILE_NAME["static-page"] === "StaticPage"`
- `components.test.ts`
  - `resolveThemeComponents({}).StaticPage === StaticPage`
  - `pickThemeSlots({ StaticPage: fn }).StaticPage === fn`

- [ ] **Step 2: 失敗を確認する**

Run: `/opt/homebrew/bin/pnpm --filter @natsuneko-laboratory/makit-runtime exec vitest run`
Expected: FAIL

- [ ] **Step 3: 実装する**

- `StaticPage` の既定実装は spec §10.2 のとおり
  - `default` では、Header の props（`homeHref`、`globalNavigation`）を `PortalHomePage` と同じ方法で集める
  - actions は `<HeaderActions>` に `<LocaleLinks links={resolveStaticPageLocaleLinks(...)} />` を children で渡す
  - `<main>` には余白・最大幅のクラスを付けない（`flex-1` のみ）
  - `search` が true なら children を `<div data-pagefind-body>` で包む
  - `bare` では Header / Footer を描画しない
- `DocsPage` と `PortalHomePage` の見た目（DOM とクラス）は変えない。actions の組み立てだけを置き換える

- [ ] **Step 4: テストが通ることを確認し、runtime をビルドする**

Run: `/opt/homebrew/bin/pnpm --filter @natsuneko-laboratory/makit-runtime exec vitest run && /opt/homebrew/bin/pnpm --filter @natsuneko-laboratory/makit-runtime typecheck && /opt/homebrew/bin/pnpm --filter @natsuneko-laboratory/makit-runtime build`
Expected: PASS、型エラーなし、`Build complete`

- [ ] **Step 5: makit 側のテストが Slot 追加で壊れていないことを確認する**

Run: `/opt/homebrew/bin/pnpm --filter @natsuneko-laboratory/makit exec vitest run`
Expected: 全件 PASS

- [ ] **Step 6: Commit**

```bash
git add packages/makit-runtime/src
git commit -m "feat(runtime): add the StaticPage slot and share header actions"
```

---

### Task 11: example と E2E 検証

**Files:**

- Create: `examples/static-pages/`
  - `package.json`: `examples/theme/package.json` と同じ形。name は `makit-example-static-pages`
  - `makit.config.ts`: title、`siteUrl: "https://example.com"`、`basePath: "/docs"`、i18n en-US / ja-JP（`examples/portal/makit.config.ts` の i18n 設定を参考にする）
  - `docs/en-us/index.md`, `docs/ja-jp/index.md`（ドキュメント側の最小ページ）
  - `pages/index.tsx` + `index.meta.ts`（`layout: "bare"`、Tailwind で全幅のヒーロー、`_components/hero.tsx` を import し、その中で `next/link` を使う）
  - `pages/pricing.tsx` + `pricing.meta.ts`（`layout: "default"`、`search: true`、async で `getCollections()` を呼ぶ）
  - `pages/about.html`, `pages/about.ja-jp.html`, `about.meta.ts`（ロケール別 title、`<a href="/pricing/">` を含む）
  - `pages/counter.tsx`（`"use client"`、`useState`）
- Modify: `.gitignore`（必要なら `examples/static-pages/dist` / `.makit`。既存の example の扱いに揃える）

- [ ] **Step 1: example を作成し、依存をリンクする**

Run: `/opt/homebrew/bin/pnpm install && /opt/homebrew/bin/pnpm --filter @natsuneko-laboratory/makit build`
Expected: 成功

- [ ] **Step 2: check を実行する**

Run: `cd examples/static-pages && node ../../packages/makit/dist/cli/index.mjs check`
Expected: エラーなし、`static-page-*` 警告なし

- [ ] **Step 3: build を実行する**

Run: `cd examples/static-pages && node ../../packages/makit/dist/cli/index.mjs build --clean`
Expected: 成功

- [ ] **Step 4: 出力 HTML を受け入れ基準に照らして確認する**

`dist/` 配下に対して `grep` / `test -f` で確認する（spec §20 の番号）。

- `dist/en-us/index.html` と `dist/ja-jp/index.html` が固定ページ（ヒーローの文言を含む）で、`<header` を含まない（#3, #14）
- `dist/en-us/pricing/index.html` が `<header` と `data-pagefind-body` を含む（#14, #17）
- `dist/en-us/about/index.html` に `data-pagefind-body` が無い（#17）
- `dist/en-us/about/index.html` に `href="/docs/pricing/"` がある（#22）
- `dist/ja-jp/about/index.html` が ja 版の本文と title を持つ（#7, #12）
- `dist/pricing/index.html`（ゲートウェイ）が存在する（Review Focus 1）
- `dist/index.html`（ルートゲートウェイ）が `/docs/en-us/` と `/docs/ja-jp/` へリンクする（Review Focus 3）
- `dist/sitemap.xml` に `/docs/en-us/pricing/` がある（#23）
- `dist/llms.txt` が存在する場合、`pricing` を含まない（#24）
- `dist/_next/static/**/*.css` にヒーローで使った Tailwind クラスが含まれる（#21）
- `dist/en-us/counter/index.html` が存在する（#19）

- [ ] **Step 5: dev サーバーで確認する（受け入れ基準 #25, #26）**

1. `node ../../packages/makit/dist/cli/index.mjs dev` を background で起動する
2. `pages/new.tsx` を追加し、`curl -s localhost:<port>/docs/en-us/new/` が 200 になることを確認する
3. `about.html` を編集して内容の反映を確認する
4. `pages/new.tsx` を削除して 404 になることを確認する（エラーで落ちないこと）
5. 確認後に停止し、`pages/new.tsx` が残っていないことを確認する

- [ ] **Step 6: Commit**

```bash
git add examples/static-pages .gitignore pnpm-lock.yaml
git commit -m "docs(examples): add a static pages example"
```

---

### Task 12: 既存ドキュメントの更新

**Files:**

- Modify: `docs/01-SPECIFICATION.md`（spec §18 の各項目: §4 の補足、§33、§40、§41 の `RouteMapEntry` と `static-pages.js`、§45 / §46 に診断）
- Modify: `docs/05-THEME.md`（§5.1 の表に `StaticPage`、§8 の例に `static-page.tsx`、§13.1 に `staticPages.dir`）
- Modify: `README.md`（Features に「Add fully custom React or HTML pages, such as landing pages」、Minimal project のツリーに `pages/` を任意として追記）
- Modify: `packages/makit/README.md`（機能一覧がある場合のみ同様に 1 行）

- [ ] **Step 1: 各ファイルを更新する**（spec の文言・章番号へのリンクで簡潔に。仕様の本文を重複させない）

- [ ] **Step 2: 整形とリンクを確認する**

Run: `npx oxfmt --check docs README.md && /opt/homebrew/bin/pnpm lint`
Expected: エラーなし

- [ ] **Step 3: リポジトリ全体を検証する**

Run: `/opt/homebrew/bin/pnpm test && /opt/homebrew/bin/pnpm typecheck`
Expected: 全パッケージ PASS

- [ ] **Step 4: Commit**

```bash
git add docs/01-SPECIFICATION.md docs/05-THEME.md README.md packages/makit/README.md
git commit -m "docs: reference static pages from the main and theme specifications"
```
