# Changelog ページ自動生成仕様

## 1. 概要

Makit は、ページのメタデータに `changelog` を指定することで、GitHub Releases から取得したリリースノートを Markdown 本文に合成し、Changelog ページを自動生成する。

Front Matter による最小の記述:

```md
---
title: Changelog
changelog: mika-f/makit
---

Makit のリリース履歴です。
```

生成されるページ:

```text
Changelog

Makit のリリース履歴です。

## v0.4.0
Pre-release · v0.4.0 · 2026-05-01
（リリース本文）

## v0.3.0
v0.3.0 · 2026-04-02
（リリース本文）
```

取得したリリースノートは、Markdown 処理パイプライン（spec §36）に入る**前**に本文へ合成する。したがって Shiki、見出し ID、ページ内目次、内部リンク書き換え、検索インデックス、`llms` 出力は、利用者が書いた本文と同様に機能する。

---

## 2. 有効化

### 2.1 Front Matter（文字列短縮形）

Front Matter はフラットなスカラー値のみを受け付ける（spec §17）ため、文字列の短縮形のみを許可する。

```md
---
changelog: mika-f/makit
---
```

### 2.2 `{filename}.meta.ts`（オブジェクト形式）

オプションを指定する場合は `.meta.ts` を使用する。

```ts
import { definePageMetadata } from "makit/metadata";

export default definePageMetadata({
  id: "changelog",
  title: "Changelog",

  changelog: {
    repository: "mika-f/makit",
    limit: 20,
    prereleases: false,
    tagPattern: "^v",
    headingLevel: 2,
  },
});
```

Front Matter にオブジェクトを書いた場合は、既存の `front-matter-too-deep` 警告としてフィールドごと無視する（spec §17）。

### 2.3 未指定のページ

`changelog` を持たないページの挙動は一切変わらない。ネットワークアクセスも発生しない。

---

## 3. リポジトリ指定

リポジトリは `owner/repository` 形式の文字列で指定する。

```text
mika-f/makit
```

URL 形式（`https://github.com/mika-f/makit`）や `.git` 付きの指定は受け付けない。形式が不正な場合はビルドエラーとする。

```text
Error: page "changelog" has an invalid `changelog` repository "https://github.com/mika-f/makit".
Use the "owner/repository" form (e.g. "mika-f/makit").
```

エラーコード: `changelog-invalid-repository`

---

## 4. 取得元

GitHub REST API の Releases エンドポイントを使用する。

```text
GET {apiBaseUrl}/repos/{owner}/{repo}/releases?per_page=100&page=N
```

* `apiBaseUrl` の標準値は `https://api.github.com`（GitHub Enterprise Server 向けに変更できる）
* リクエストヘッダー: `Accept: application/vnd.github+json`、`X-GitHub-Api-Version: 2022-11-28`、`User-Agent: makit`
* トークンがある場合は `Authorization: Bearer {token}` を付与する
* `limit` を満たすまでページングし、最大 5 ページ（500 件）で打ち切る

取得したリリースから利用するフィールド:

| フィールド        | 用途                    |
| ------------ | --------------------- |
| `tag_name`   | 見出し・リンク先・`tagPattern` |
| `name`       | 見出し                   |
| `html_url`   | リリースへのリンク             |
| `published_at` | 日付表示・並び順の同順位判定      |
| `created_at` | `published_at` が無い場合の代替 |
| `prerelease` | ラベル表示・`prereleases` フィルタ |
| `draft`      | 除外判定                  |
| `body`       | リリース本文                |

Draft リリースは常に除外する。

並び順は `tag_name` から読み取ったバージョンの降順とする（時系列順ではない）。バージョンは次の規則で解釈する。

* 先頭の `v` / `V`、および `@` `/` `-` までの接頭辞（`makit@1.2.0`、`@scope/pkg@1.4.0` など）を除いた部分を数値識別子の列として読む
* 数値識別子は数値として比較し、桁数の少ない側は不足分を `0` として扱う（`v1.2` と `v1.2.0` は同順位）
* プレリリース識別子は semver §11.4 に従って比較する。プレリリースは同じバージョンの正式リリースより下位となる（`v2.0.0` > `v2.0.0-rc.2` > `v2.0.0-rc.1` > `v2.0.0-beta.1`）
* ビルドメタデータ（`+` 以降）は比較に使用しない
* バージョンとして解釈できないタグ（`nightly` など）はバージョンを持つリリースより後に置く
* 同順位のリリースは `published_at`（無い場合は `created_at`）の降順とする

並び替えは `limit` の適用前に行う。したがってページには常にバージョンの高いリリースが残る。

---

## 5. 生成される Markdown

リリース 1 件につき、次の Markdown を生成する。

```md
## {name または tag_name}

{ラベル} · [{tag_name}]({html_url}) · {日付}

{リリース本文}
```

メタ行の要素は ` · ` で連結し、次の順で並べる。

1. プレリリースラベル（`prerelease` が `true` のときのみ、`**Pre-release**`)
2. タグ名のリンク（`[{tag_name}]({html_url})`。リリースへの導線として常に出力する)
3. 発行日（`published_at` が無い場合は省略）

`name` が空の場合、見出しは `tag_name` とする。

リリースが 1 件も無い場合は、`labels.empty`（標準値 `No releases yet.`）を段落として出力する。この場合 `changelog-empty` 警告を出す。

---

## 6. 挿入位置

本文中に次のマーカー行がある場合、その行を生成 Markdown で置き換える。

```md
<!-- makit:changelog -->
```

例:

```md
---
changelog: mika-f/makit
---

# Changelog

最新のリリースは以下のとおりです。

<!-- makit:changelog -->

過去のリリースは GitHub を参照してください。
```

マーカーが無い場合は、本文の末尾に空行を 1 行挟んで追加する。

マーカーは行全体がマーカーである場合にのみ認識する（前後の空白は無視する）。2 つ目以降のマーカーは置換せず、そのまま残す（HTML コメントであるため出力には現れない）。

マーカーはコードフェンス内では認識しない。

---

## 7. 見出しレベル

各リリースの見出しレベルは `headingLevel`（標準値 `2`）とする。指定できる範囲は `1` から `5` とする。

リリース本文に含まれる見出しは、本文中で最も浅い見出しが `headingLevel + 1` になるよう一律にシフトする。シフト後に 6 を超える見出しは 6 に丸める。

`headingLevel: 2` で、本文が次の場合:

```md
## Features
### Details
```

シフト後:

```md
### Features
#### Details
```

シフトはコードフェンス（``` および `~~~`）の内側には適用しない。

見出し ID は通常のページと同様に見出しテキストから生成する（spec §36）。したがって `## v0.4.0` のアンカーは `#v040` となり、ページ内目次（`markdown.tableOfContents`）にもリリース見出しが並ぶ。

---

## 8. フィルタリング

| オプション         | 標準値    | 説明                                       |
| ------------- | ------ | ---------------------------------------- |
| `limit`       | `30`   | 取得・表示する最大件数（1〜500）                       |
| `prereleases` | `true` | プレリリースを含めるか                              |
| `tagPattern`  | 未指定    | タグ名に対する正規表現。一致するリリースのみを対象とする             |
| `since`       | 未指定    | ISO 8601 の日付。これ以降に発行されたリリースのみを対象とする      |

`tagPattern` はモノレポで有用である。

```ts
changelog: {
  repository: "mika-f/makit",
  tagPattern: "^makit@",
}
```

`tagPattern` が正規表現として不正な場合はビルドエラー（`changelog-invalid-tag-pattern`）とする。

フィルタは取得後に適用し、`limit` はフィルタ適用後のリリースをバージョン順（§4）に並べたうえで効く。

---

## 9. 日付と表示ラベル

日付は `Intl.DateTimeFormat` を用い、そのページのロケール（i18n 無効時は `lang`）で整形する。書式は `changelog.dateStyle`（`full` / `long` / `medium` / `short` / `iso`、標準値 `medium`）で切り替える。`iso` は `YYYY-MM-DD` を出力する。

ラベルはロケール別に指定できる。

```ts
changelog: {
  labels: {
    prerelease: {
      "en-US": "Pre-release",
      "ja-JP": "プレリリース",
    },
    empty: {
      "en-US": "No releases yet.",
      "ja-JP": "まだリリースがありません。",
    },
  },
}
```

---

## 10. 認証とレート限度

トークンは次の順で解決する。

1. `changelog.token`
2. `process.env.MAKIT_GITHUB_TOKEN`
3. `process.env.GITHUB_TOKEN`

トークンは認証情報であるため、メタデータからの `process.env` 参照（spec §21）の対象外とし、`env-var-in-metadata` 警告の対象にもしない。

未認証の GitHub API はレート限度が低い（IP あたり毎時 60 回）。レート限度に達した場合（`403` / `429` かつ `x-ratelimit-remaining: 0`）は、トークンの設定を促すメッセージを添えて `changelog-fetch-failed` 警告を出す。

トークンを設定ファイルに直接書かず、環境変数から渡すことを推奨する。

---

## 11. キャッシュ

取得結果は `.makit/cache/changelog/` に保存する。

```text
.makit/cache/changelog/
└── {sha256(apiBaseUrl + repository)}.json
```

エントリー:

```json
{
  "fetchedAt": 1780000000000,
  "etag": "W/\"...\"",
  "count": 30,
  "releases": []
}
```

* `cacheTtl`（標準値 `3600` 秒）以内であればリクエストを行わずキャッシュを使用する
* TTL 切れの場合は `If-None-Match` を付けた条件付きリクエストを行い、`304` ならキャッシュを再利用して `fetchedAt` のみ更新する
* `count` は取得済み件数。より多くの件数を要求するページがある場合は TTL 内でも再取得する
* キャッシュはリポジトリ単位であり、フィルタ（`limit` 以外）には依存しない。同じリポジトリを参照する複数のページ・複数のロケールは 1 回の取得を共有する

同一ビルド内では、取得結果をメモリ上でも共有し、同じリポジトリに対して 2 回以上リクエストしない。

`makit clean` は `.makit/` を削除するため、Changelog キャッシュも消える。

Markdown の処理結果キャッシュ（spec §22）は本文の内容をキーに含むため、合成後の Markdown が変われば自動的にキャッシュミスとなる。追加のキー拡張は不要である。

---

## 12. オフラインと失敗時の挙動

`changelog.offline: true`、または環境変数 `MAKIT_OFFLINE`（`1` / `true`）が設定されている場合、ネットワークアクセスを一切行わない。TTL に関係なくキャッシュを使用し、キャッシュが無い場合は空として扱う。

取得に失敗した場合（ネットワークエラー、`4xx`、`5xx`、JSON パース失敗）:

1. キャッシュがあれば、TTL 切れでもそれを使用する
2. キャッシュが無ければ、そのページの Changelog を空として扱う（`labels.empty` を出力する）

いずれの場合も `changelog-fetch-failed` 警告を出し、ビルドは継続する。CI で失敗させたい場合は `validation.failOn` または `validation.strict` で昇格させる。

```ts
validation: {
  failOn: ["changelog-fetch-failed"],
}
```

`changelog.enabled: false` は機能全体を無効化する。この場合、`changelog` を持つページはマーカーを残したまま本文のみを出力し、ネットワークアクセスも警告も発生しない。

---

## 13. 設定

`makit.config.ts` の `changelog` はサイト全体の既定値を定める。ページ側の指定が常に優先する。

```ts
import { defineConfig } from "makit";

export default defineConfig({
  title: "Makit",

  changelog: {
    apiBaseUrl: "https://api.github.com",
    cacheTtl: 3600,
    limit: 30,
    prereleases: true,
    headingLevel: 2,
    dateStyle: "medium",

    labels: {
      prerelease: {
        "en-US": "Pre-release",
        "ja-JP": "プレリリース",
      },
    },
  },
});
```

---

## 14. 型

### 14.1 サイト設定

```ts
export type ChangelogDateStyle =
  | "full"
  | "long"
  | "medium"
  | "short"
  | "iso";

export interface ChangelogLabelsConfig {
  /** @default "Pre-release" */
  prerelease?: string | LocalizedValue<string>;
  /** @default "No releases yet." */
  empty?: string | LocalizedValue<string>;
}

export interface ChangelogConfig {
  /** @default true */
  enabled?: boolean;

  /** @default "https://api.github.com" */
  apiBaseUrl?: string;

  /**
   * GitHub API トークン。省略時は MAKIT_GITHUB_TOKEN、
   * 次いで GITHUB_TOKEN を参照する。
   */
  token?: string;

  /**
   * 取得結果を再利用する秒数。0 は毎回の条件付きリクエストを意味する。
   *
   * @default 3600
   */
  cacheTtl?: number;

  /**
   * ネットワークアクセスを行わず、キャッシュのみを使用する。
   * 環境変数 MAKIT_OFFLINE でも有効化できる。
   *
   * @default false
   */
  offline?: boolean;

  /** @default 30 */
  limit?: number;

  /** @default true */
  prereleases?: boolean;

  /** @default 2 */
  headingLevel?: number;

  /** @default "medium" */
  dateStyle?: ChangelogDateStyle;

  labels?: ChangelogLabelsConfig;
}
```

### 14.2 ページメタデータ

```ts
export interface PageChangelogConfig {
  /** GitHub リポジトリ（`owner/repository` 形式）。 */
  repository: string;

  limit?: number;
  prereleases?: boolean;

  /** タグ名に対する正規表現フィルタ。 */
  tagPattern?: string;

  /** この日付以降に発行されたリリースのみを対象とする（ISO 8601）。 */
  since?: string;

  headingLevel?: number;
}

export type PageChangelog = string | PageChangelogConfig;

export interface PageMetadata {
  // ...
  /**
   * GitHub Releases から Changelog を生成する（CHANGELOG §2）。
   * 文字列は `{ repository }` の短縮形。
   */
  changelog?: PageChangelog;
}
```

---

## 15. Markdown 処理との関係

リリース本文は第三者が書いた Markdown であり、そのままページ本文として処理される。

* `markdown.allowDangerousHtml` が `false`（標準値）の場合、リリース本文中の生 HTML（`<img>`、`<details>` など）は出力されない。GitHub の Releases 画面と表示が異なりうる点に注意する。
* `allowDangerousHtml: true` にすると生 HTML を出力するが、リポジトリの書き込み権限を持つ者が任意の HTML をサイトへ注入できることを意味する。信頼できるリポジトリにのみ使用する。
* コードブロックは Shiki でハイライトされる。未知の言語は通常どおり `unknown-code-language` 警告の対象となる。
* リリース本文中の絶対 URL は外部リンクとして扱われる（`markdown.externalLinks`）。相対リンクは GitHub 上での相対パスであり、Makit のページ解決とは一致しないため、`broken-link` 警告の対象になりうる。

---

## 16. 国際化

リリースノートは上流の成果物であり、翻訳の対象としない。同じ `changelog` を指定した各ロケールのページには同一のリリース本文が入る。ロケールによって変わるのは日付の書式とラベルのみである。

未翻訳ロケールのフォールバックページ（spec §35.4）は、通常どおりデフォルトロケールのページを複製する。合成は複製前に完了しているため、フォールバックページにもリリース本文が含まれる。

---

## 17. CLI

| コマンド           | 挙動                                       |
| -------------- | ---------------------------------------- |
| `makit dev`    | ビルドと同一。TTL 切れのときのみ再取得する。リリースの更新をポーリングはしない |
| `makit build`  | TTL に従って取得する                             |
| `makit check`  | ビルドと同一の取得を行い、`changelog-*` 診断を報告する       |
| `makit clean`  | `.makit/` ごとキャッシュを削除する                    |

`makit dev` は Changelog を「監視対象のファイル」として扱わない。最新のリリースを取り込むには、TTL の経過を待つか `makit clean` を実行する。

---

## 18. 診断

エラー（ビルド停止）:

| コード                            | 条件                        |
| ------------------------------ | ------------------------- |
| `changelog-invalid-repository` | `owner/repository` 形式でない  |
| `changelog-invalid-tag-pattern`| `tagPattern` が正規表現として不正   |
| `changelog-invalid-option`     | `limit` / `headingLevel` / `since` が範囲外または解釈不能 |

警告（`validation.failOn` / `validation.strict` で昇格可能）:

| コード                       | 条件                            |
| ------------------------- | ----------------------------- |
| `changelog-fetch-failed`  | 取得に失敗し、キャッシュまたは空にフォールバックした    |
| `changelog-empty`         | フィルタ適用後にリリースが 1 件も無い          |

---

## 19. 非目標

* GitHub 以外のホスティング（GitLab、Gitea など）
* リポジトリ内の `CHANGELOG.md` やタグ、コミット履歴からの生成
* リリースごとの個別ページ生成やページネーション UI
* リリース本文の翻訳
* ブラウザ実行時の取得（生成物はあくまで静的）
* `@user` や `#123` の自動リンク化（GFM による URL の自動リンクのみ）
* リリース以外の GitHub リソース（Issue、PR、Discussion）の取り込み

---

## 20. 受け入れ基準

1. Front Matter の `changelog: owner/repo` でリリースノートを取り込める
2. `.meta.ts` の `changelog` オブジェクトでオプションを指定できる
3. `owner/repository` 形式でない指定はビルドエラーになる
4. Draft リリースが常に除外される
5. `prereleases: false` でプレリリースが除外される
6. `tagPattern` と `since` と `limit` がこの順で適用され、リリースが（時系列順ではなく）バージョンの降順に並ぶ
7. リリース見出しのレベルが `headingLevel` になり、本文中の見出しがその下へシフトする
8. リリース見出しがページ内目次に現れ、アンカーが生成される
9. `<!-- makit:changelog -->` の位置に生成結果が挿入され、マーカーが無い場合は末尾に追加される
10. コードフェンス内のマーカーおよび見出しは変更されない
11. 同じリポジトリを参照する複数ページ・複数ロケールで取得が 1 回に共有される
12. TTL 内の再ビルドでネットワークアクセスが発生しない
13. 取得失敗時にキャッシュへフォールバックし、`changelog-fetch-failed` 警告を出してビルドが継続する
14. キャッシュも無い場合に `labels.empty` を出力してビルドが継続する
15. `changelog.offline` / `MAKIT_OFFLINE` でネットワークアクセスを完全に抑止できる
16. `changelog.enabled: false` で機能全体を無効化できる
17. 日付がページのロケールと `dateStyle` に従って整形される
18. `labels` をロケール別に指定できる
19. `validation.failOn` で `changelog-fetch-failed` をビルドエラーへ昇格できる
20. `changelog` を持たないページではネットワークアクセスが発生しない
