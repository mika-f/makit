# Changelog ページ

ページに GitHub リポジトリを指定すると、Makit がビルド時にそのリポジトリのリリースを取得してページに流し込みます。リリースノートは Markdown 処理の前に本文へ合成されるため、見出しのアンカー、ページ内目次、シンタックスハイライト、検索インデックスは、手で書いた本文とまったく同じように機能します。

```md
---
title: Changelog
changelog: mika-f/makit
---

Makit のリリース履歴です。
```

リポジトリは `owner/repository` 形式で書きます。`https://github.com/mika-f/makit` のような URL はビルドエラーになります。

## 挿入位置を決める

マーカーが無い場合、リリースは本文の末尾に追加されます。位置を指定するには `<!-- makit:changelog -->` を書きます。

```md
---
changelog: mika-f/makit
---

# Changelog

最新のリリースは以下のとおりです。

<!-- makit:changelog -->

過去のリリースは GitHub を参照してください。
```

置き換わるのは最初のマーカーだけです。コードフェンス内のマーカーはそのまま残ります。

## リリースを絞り込む

リポジトリ以外のオプションは `.meta.ts` に書きます。YAML Front Matter はフラットな値しか扱えないためです。

```ts
import { definePageMetadata } from "@natsuneko-laboratory/makit/metadata";

export default definePageMetadata({
  id: "changelog",
  title: "Changelog",
  changelog: {
    repository: "mika-f/makit",
    limit: 20,
    prereleases: false,
    tagPattern: "^v",
    since: "2026-01-01",
    headingLevel: 2,
  },
});
```

| オプション          | 既定値    | 説明                                                        |
| -------------- | ------ | --------------------------------------------------------- |
| `repository`   | —      | `owner/repository` 形式の GitHub リポジトリ。                    |
| `limit`        | `30`   | 表示するリリースの最大件数（1〜500）。                              |
| `prereleases`  | `true` | プレリリースを含めるかどうか。                                     |
| `tagPattern`   | —      | タグ名が一致すべき正規表現。モノレポで有用です。                        |
| `since`        | —      | ISO 8601 の日付。これ以降に発行されたリリースだけを表示します。        |
| `headingLevel` | `2`    | 各リリースの見出しレベル（1〜5）。                                |

Draft リリースは常に表示されません。フィルタは表の順に適用され、`limit` はそれらを通過した件数に対して効きます。

各リリースは見出し、タグへのリンクと発行日の行、リリース本文の順に出力されます。リリース本文中の見出しは、そのリリース自身の見出しの下に入るようレベルがシフトされるため、ページ内目次が崩れません。

## サイト全体の既定値

`makit.config.ts` の `changelog` は、すべての Changelog ページの既定値を定めます。

```ts
import { defineConfig } from "@natsuneko-laboratory/makit";

export default defineConfig({
  title: "My Documentation",
  changelog: {
    limit: 20,
    prereleases: false,
    dateStyle: "long",
    labels: {
      prerelease: { "en-US": "Pre-release", "ja-JP": "プレリリース" },
      empty: { "en-US": "No releases yet.", "ja-JP": "まだリリースがありません。" },
    },
  },
});
```

| オプション        | 既定値                      | 説明                                                        |
| ------------ | ------------------------ | --------------------------------------------------------- |
| `enabled`    | `true`                   | `false` で機能全体を無効化します。ページは本文だけを出力します。          |
| `apiBaseUrl` | `https://api.github.com` | GitHub Enterprise Server ではこれを変更します。                 |
| `token`      | —                        | 省略時は `MAKIT_GITHUB_TOKEN`、次いで `GITHUB_TOKEN` を参照します。 |
| `cacheTtl`   | `3600`                   | 取得結果を再利用する秒数。`0` は毎回の再検証を意味します。             |
| `offline`    | `false`                  | ネットワークへ一切アクセスしません。`MAKIT_OFFLINE=1` でも同じです。   |
| `dateStyle`  | `"medium"`               | `full`、`long`、`medium`、`short`、`iso` から選びます。         |
| `labels`     | 英語の既定値                   | プレリリースの表示と、該当が無い場合の文言。                        |

日付はそのページのロケールで整形されます。リリースノート自体は GitHub から取得したまま共通ですが、日付の書式は翻訳ページごとに変わります。

## トークンとレート限度

未認証の GitHub API は IP あたり毎時 60 リクエストまでです。少数のリポジトリなら十分ですが、頻繁に走る CI では足りません。トークンは `makit.config.ts` に書かず、環境変数 `GITHUB_TOKEN` で渡してください。GitHub Actions では自動的に用意されます。

取得結果は `.makit/cache/changelog/` にキャッシュされ、同じリポジトリを指すすべてのページとロケールで共有されます。`cacheTtl` の経過後は `ETag` による条件付きリクエストで再検証します。`makit dev` は新しいリリースをポーリングしません。すぐに反映したい場合は `makit clean` を実行してください。

## GitHub へ到達できない場合

取得の失敗がビルドを止めることはありません。キャッシュがあればそれを、無ければ `labels.empty` の文言を出力し、いずれの場合も `changelog-fetch-failed` 警告を報告します。古い Changelog でパイプラインを失敗させたい場合は昇格させてください。

```ts
validation: {
  failOn: ["changelog-fetch-failed"],
},
```

フィルタの結果リリースが 1 件も残らなかった場合は、代わりに `changelog-empty` を報告します。

## リリースノート内の生 HTML

リリース本文には `<img>` や `<details>` などの HTML が含まれることがあります。Makit は既定で生 HTML を除去するため、それらは表示されません。`markdown.allowDangerousHtml: true` にすると表示できますが、リリースを公開できる人が誰でもサイトへ HTML を注入できることを意味します。自分が管理するリポジトリにのみ使用してください。
