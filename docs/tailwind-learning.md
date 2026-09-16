# Tailwind CSS 学習まとめ

## 1. ユーティリティクラスの体系

Tailwindは、**1つのクラスに1つの役割を持たせる**書き方です。

| クラス           | 役割              |
| ------------- | --------------- |
| `flex`        | `display: flex` |
| `grid`        | `display: grid` |
| `gap-4`       | 要素間の余白          |
| `px-3`        | 左右のpadding      |
| `py-2`        | 上下のpadding      |
| `text-lg`     | 文字サイズ           |
| `font-bold`   | 太字              |
| `bg-blue-500` | 背景色             |

数字は基本的に**Tailwindが定めた間隔・サイズのスケール**に対応します。

```text
p-2
↓
padding: 0.5rem
```

`p` = padding、`2` = サイズという規則です。

---

## 2. 状態バリアント

`hover:` や `focus:` は、**特定の状態のときだけCSSを適用する仕組み**です。

```text
hover:bg-blue-700
```

これは、

> マウスを乗せたときだけ `bg-blue-700` を適用する

という意味です。

代表例：

* `hover:` → マウスを乗せたとき
* `focus:` → フォーカスされたとき
* `disabled:` → disabled状態のとき
* `active:` → クリック中など

つまり、

```text
hover:bg-blue-700
```

は、**`hover`という状態バリアント + `bg-blue-700`というユーティリティクラス**という構造です。

---

## 3. レスポンシブ対応

`sm:`、`md:` などは、**画面幅に応じてクラスを適用する仕組み**です。

```text
text-sm
md:text-lg
```

の場合、

```text
通常
→ 小さい文字

md以上
→ 大きい文字
```

となります。

例えば、

```text
text-sm
md:text-lg
lg:text-xl
```

のように、**画面が大きくなるにつれてCSSを上書きしていく**使い方ができます。

Tailwindは基本的に**モバイルファースト**です。

---

## 4. Tailwind v4特有の変更点

Tailwind v4では、v3までの設定方法から大きく変わりました。

### Tailwind v3

`tailwind.config.js` にテーマやプラグインなどを設定するのが中心でした。

### Tailwind v4

CSS側で設定する方式が強くなりました。

今回使用した例：

```css
@plugin "@tailwindcss/typography";

@theme inline {
  --color-background: var(--background);
}
```

主なもの：

* `@plugin` → TailwindプラグインをCSSから読み込む
* `@theme` → Tailwindで使用するテーマ値をCSS側で定義する
* `@import "tailwindcss"` → Tailwind自体を読み込む

つまり、**v3よりもCSSを中心にTailwindを設定する方向になった**と理解しておけばよいです。

---

## 5. `prose` クラス

`prose` は、**文章・Markdownから生成したHTMLを読みやすく整えるためのクラス**です。

MarkdownをHTMLに変換すると、例えば次のようになります。

```html
<h1>タイトル</h1>
<p>文章です。</p>
<ul>
  <li>項目</li>
</ul>
```

そのままだとブラウザ標準の見た目ですが、

```html
<div class="prose">
  ...
</div>
```

とすると、Typographyプラグインによって文章向けのスタイルが適用されます。

対象になるもの：

* 見出し
* 段落
* リスト
* リンク
* 引用
* コード

など。

今回のナレッジ共有システムでは、**ユーザーが入力したMarkdownをHTMLとして表示する部分に適している**ということです。
