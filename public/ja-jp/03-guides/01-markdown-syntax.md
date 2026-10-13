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

## タブ

インストール方法や OS ごとの手順を、通常の `.md` ファイルで切り替えて表示できます。MDX、コンポーネントの import、追加の設定は不要です。

`::::tabs` でグループを作り、その中に `:::tab[ラベル]` を並べます。タブの本文はインデントせずに書け、段落、リスト、表、画像、アラート、コードブロックなど、通常の Markdown を使えます。

````markdown
::::tabs[Package manager]{default="pnpm"}
:::tab[npm]

```sh
npm install -D @natsuneko-laboratory/makit
```

:::
:::tab[pnpm]

```sh
pnpm add -D @natsuneko-laboratory/makit
```

:::
::::
````

レンダリング結果:

::::tabs[Package manager]{default="pnpm"}
:::tab[npm]

```sh
npm install -D @natsuneko-laboratory/makit
```

:::
:::tab[pnpm]

```sh
pnpm add -D @natsuneko-laboratory/makit
```

:::
::::

- グループの `[Package manager]` は支援技術向けの名前です。省略すると `Tabs` になります。
- `{default="pnpm"}` は初期表示するタブのラベルです。省略すると先頭のタブを表示します。存在しないラベルは警告になり、先頭に戻ります。
- タブをクリックするか、タブにフォーカスして左右の矢印、Home、End キーで切り替えます。
- 各グループは独立して動作します。本文中の見出しへのアンカーリンクを開くと、その見出しを含むタブが表示されます。
- JavaScript が無効な場合と印刷時は、ラベルとすべての本文を表示します。

`:` と `tabs` / `tab` の間に空白を入れないでください。外側のフェンスは内側より長くします。タブを入れ子にする場合も、外側に向かってコロンを増やします。

```markdown
::::::tabs
:::::tab[macOS]

::::tabs
:::tab[Apple Silicon]

Apple Silicon 向けの手順。

:::
:::tab[Intel]

Intel 向けの手順。

:::
::::

:::::
:::::tab[Windows]

Windows 向けの手順。

:::::
::::::
```

グループの直下にはラベル付きの `tab` だけを置きます。空のグループ、ラベルのないタブ、グループ外のタブは警告になり、本文は通常の Markdown として残ります。コードフェンス内のタブ記法は解釈されず、サンプルとしてそのまま表示されます。

記法は [VitePress のタブプラグイン](https://github.com/Red-Asuka/vitepress-plugin-tabs#usage) のコンテナ形式を参考にし、Makit の Remark パイプラインに合わせて [Markdown directives](https://github.com/remarkjs/remark-directive) のラベルと属性を使っています。[Material for MkDocs](https://squidfunk.github.io/mkdocs-material/reference/content-tabs/) の `=== "ラベル"` 形式と異なり、タブ本文のインデントは不要です。

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

区切り行のコロンで各列の配置を指定できます。左側だけ、両側、右側にコロンを置くと、それぞれ左寄せ、中央寄せ、右寄せになります。

```markdown
| 左寄せ | 中央寄せ | 右寄せ |
| :----- | :------: | -----: |
| a      |    b     |      c |
```

レンダリング結果:

| 左寄せ | 中央寄せ | 右寄せ |
| :----- | :------: | -----: |
| a      |    b     |      c |

---

## HTML とプラグイン

生の HTML は安全のため既定で無効です。信頼できるコンテンツだけを扱う場合は `markdown.allowDangerousHtml` を有効にできます。Remark / Rehype プラグイン、外部リンクの属性、Shiki テーマ、目次の範囲は[設定リファレンス](../04-reference/02-configuration.md#markdown)で設定します。
