# Markdown 構文

Makit は Markdown をページ本文としてレンダリングします。GitHub Flavored Markdown（表、タスクリスト、取り消し線など）は既定で有効です。ここでは、入力する構文と表示結果を対にして説明します。

## 見出し、段落、リンク

```markdown
# ページタイトル

段落は空行で区切ります。**強調**、`インラインコード`、[Makit](https://github.com/mika-f/makit) を使えます。

## セクション
```

レンダリング結果:

# ページタイトル

段落は空行で区切ります。**強調**、`インラインコード`、[Makit](https://github.com/mika-f/makit) を使えます。

## セクション

先頭の H1 は、メタデータで `title` を指定しない場合のページタイトルになります。見出しには ID が付き、目次には既定で H2 と H3 が表示されます。

## リストと引用

```markdown
- 順序なしの項目
- もう一つの項目

1. 最初の手順
2. 次の手順

> 引用は補足や出典の説明に使えます。

- [x] 完了した作業
- [ ] 未完了の作業
```

レンダリング結果:

- 順序なしの項目
- もう一つの項目

1. 最初の手順
2. 次の手順

> 引用は補足や出典の説明に使えます。

- [x] 完了した作業
- [ ] 未完了の作業

## コードブロック

言語名を指定するとシンタックスハイライトされます。サイト設定でコピーボタン（既定で有効）と行番号を制御できます。

````markdown
```ts src/makit.config.ts lineNumbers
export default { title: "My Documentation" };
```
````

レンダリング結果:

```ts src/makit.config.ts lineNumbers
export default { title: "My Documentation" };
```

行末の注釈で、変更箇所を示せます。注釈自体は出力されません。

````markdown
```ts
const changed = true; // [!code highlight]
const added = true; // [!code ++]
const removed = false; // [!code --]
```
````

レンダリング結果:

```ts
const changed = true; // [!code highlight]
const added = true; // [!code ++]
const removed = false; // [!code --]
```

`markdown`、`md`、`mdx` のフェンスでは、これらの文字列はサンプルとしてそのまま表示されます。

## GitHub 形式のアラート

次の構文は情報の重要度を明確にします。`NOTE`、`TIP`、`IMPORTANT`、`WARNING`、`CAUTION` を使えます。

```markdown
> [!WARNING]
> 本番サイトへ公開する前に `makit check` を実行してください。
```

レンダリング結果:

> [!WARNING]
> 本番サイトへ公開する前に `makit check` を実行してください。

## 表と水平線

```markdown
| 項目      | 説明     |
| --------- | -------- |
| `title`   | サイト名 |
| `siteUrl` | 公開 URL |

---
```

レンダリング結果:

| 項目      | 説明     |
| --------- | -------- |
| `title`   | サイト名 |
| `siteUrl` | 公開 URL |

---

## HTML とプラグイン

生の HTML は安全のため既定で無効です。信頼できるコンテンツだけを扱う場合は `markdown.allowDangerousHtml` を有効にできます。Remark / Rehype プラグイン、外部リンクの属性、Shiki テーマ、目次の範囲は[設定リファレンス](../04-reference/configuration.md#markdown)で設定します。
