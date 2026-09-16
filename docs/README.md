# 社内ナレッジベース(簡易Wiki)システム

研修(Git&GitHub, TypeScript, React, Next.js, Prisma)の成果物として開発した、社内向け簡易ナレッジベース(Wiki)システムです。

## 背景

HR企画部の月例報告会で「属人化」が課題として挙げられていたことをきっかけに、ナレッジ共有の効率化(アウトプットの高速化・保存性向上・アクセスの簡易化)を目的として企画しました。詳細な背景・要件は [docs/要件定義書.md](./docs/要件定義書.md) を参照してください。

本プロジェクトの主目的は、セキュアな本番システムの構築自体ではなく、実務で使われる技術・開発フローに関する知識と経験を得ることにあります。

## 主な機能

- 記事の作成・編集・削除(論理削除)・一覧表示・詳細閲覧
- Markdown入力支援(見出し・太字・箇条書き・リンクのツールバー)+ リアルタイムプレビュー
- 著者選択(ログイン不要、User一覧からのプルダウン選択)
- 改訂履歴の保存・一覧表示(Gitのコミット思想を応用した追記型設計)
- 全文検索(タイトル・本文の部分一致)
- 資料構成支援(テンプレート入力):5セクション構成(結論/背景・課題/原因・ポイント/対応方法・手順/注意点・まとめ)のテンプレートで、記事作成画面から「自由入力」「テンプレート入力」を切り替え可能
- Gamma API連携による資料自動生成(モック実装。詳細は下記「Gamma連携について」参照)

### 未実装のストレッチ機能

- タグ/カテゴリによる記事の絞り込み
- 記事間リンク
- コメント機能

## Gamma連携について

資料構成支援で作成した内容を、外部生成AI「Gamma」でスライド/ドキュメント化する機能です。`DocumentGenerator`インターフェースで抽象化しており、動作確認用の`MockGenerator`(ダミーURLを返す)と、実際のAPI呼び出しを行う`GammaGenerator`(雛形のみ、有料プラン未加入のため未検証)を切り替え可能な構成にしています。現在は`MockGenerator`を使用しています。

実際の生成クオリティは、gamma.appの無料枠に本システムから送信されるであろうMarkdown形式のテキストを手動投入して別途検証しました。

## 技術スタック

| 分類 | 技術 |
|---|---|
| フレームワーク | Next.js(App Router) |
| 言語 | TypeScript |
| UI | React、Tailwind CSS(+ @tailwindcss/typography) |
| ORM | Prisma(@prisma/adapter-pg) |
| データベース | PostgreSQL(開発:Docker、本番:Neon) |
| デプロイ先 | Vercel |
| バージョン管理 | Git / GitHub(pnpm) |
| Markdown変換 | unified / remark / rehype(rehype-sanitizeによるXSS対策込み) |
| 生成AI連携 | Gamma API(モック実装) |

技術選定の理由は [docs/口頭ディフェンス想定問答集.md](./docs/口頭ディフェンス想定問答集.md) にまとめています。

## ディレクトリ構成

```
wiki-app/
├── src/
│   ├── app/
│   │   ├── pages/
│   │   │   ├── page.tsx                    # 記事一覧(Server Component)
│   │   │   ├── actions.ts                  # Server Actions
│   │   │   ├── PageForm.tsx                # 自由記述モードのフォーム
│   │   │   ├── DocumentTemplateForm.tsx    # テンプレート入力モードのフォーム(5セクション)
│   │   │   ├── NewPageSwitcher.tsx         # 自由入力/テンプレート入力の切り替え
│   │   │   ├── MarkdownField.tsx           # textarea+ref+Markdown挿入処理
│   │   │   ├── MarkdownToolbar.tsx         # ツールバー(ボタン表示のみ)
│   │   │   ├── MarkdownPreview.tsx         # Markdown→HTML変換プレビュー
│   │   │   ├── SearchBox.tsx               # 検索ボックス(Client Component)
│   │   │   ├── GammaGenerationButton.tsx   # Gamma生成ボタン+ポーリング表示
│   │   │   ├── new/page.tsx                # 記事作成画面
│   │   │   ├── search/page.tsx             # 検索結果画面
│   │   │   └── [id]/
│   │   │       ├── page.tsx                # 記事詳細(Server Component)
│   │   │       ├── DeleteButton.tsx        # 削除ボタン(Client Component)
│   │   │       └── edit/page.tsx           # 記事編集画面
│   │   ├── api/generation-requests/[id]/route.ts  # Gamma生成状況ポーリング用
│   │   ├── error.tsx                       # レンダー中エラー用バウンダリ
│   │   ├── unexpected-error/page.tsx       # イベントハンドラ内エラー用の遷移先
│   │   └── layout.tsx / globals.css
│   └── lib/
│       ├── prisma.ts                       # Prismaクライアント(globalThisキャッシュ)
│       ├── markdown.ts                     # Markdown→HTML変換パイプライン
│       ├── markdownSyntax.ts               # Markdown記法挿入の純粋関数
│       ├── templateContent.ts              # テンプレート5セクション→Markdown組み立て
│       └── document-generator/
│           ├── types.ts                    # DocumentGeneratorインターフェース
│           ├── mock.ts                     # MockGenerator(動作確認用)
│           ├── gamma.ts                    # GammaGenerator(本番切り替え用、未検証)
│           └── index.ts                    # 使用する実装の切り替え窓口
├── prisma/
│   ├── schema.prisma                       # Department, User, Page, Revision, Tag, GenerationRequest
│   ├── migrations/
│   └── seed.ts                             # 部署10件・社員10件・記事5件のシードデータ
├── prisma.config.ts
├── docs/
│   ├── 要件定義書.md
│   ├── 設計書.md
│   ├── develop.md                          # 開発記録(調査・学習内容・設計判断・トラブルシューティング)
│   ├── vercel-learning.md                  # Vercelの仕組みに関する学習まとめ
│   ├── 認証の学習まとめ.md                  # 認証(User/Session/Cookie等)に関する学習まとめ(未実装)
│   └── 口頭ディフェンス想定問答集.md
└── README.md
```

## セットアップ

### 前提条件

- Node.js
- pnpm(`corepack enable`で有効化)
- PostgreSQLデータベース(ローカル、またはVercel Postgres/Neon等のホスティングサービス)

### 手順

1. リポジトリをクローン

   ```bash
   git clone <このリポジトリのURL>
   cd wiki-app
   ```

2. 依存パッケージをインストール

   ```bash
   pnpm install
   pnpm approve-builds --all
   ```

3. 環境変数を設定

   `.env`に以下を設定してください。

   | 変数名 | 説明 |
   |---|---|
   | `DATABASE_URL` | PostgreSQLの接続文字列 |
   | `GAMMA_API_KEY` | Gamma APIキー(未設定でも`MockGenerator`使用時は動作する) |

4. データベースのマイグレーションとシードデータ投入

   ```bash
   pnpm exec prisma migrate dev
   pnpm exec prisma db seed
   ```

5. 開発サーバーを起動

   ```bash
   pnpm dev
   ```

   `http://localhost:3000/pages` にアクセスして動作を確認できます。

## デプロイ

Vercelへのデプロイを想定しています。GitHubリポジトリと連携することで、mainブランチへのpushで自動デプロイされます。ビルドコマンドは`prisma generate && next build`とし、Prisma Clientの生成漏れを防いでいます。マイグレーションは、`schema.prisma`変更時にNeon(本番)側へも`migrate deploy`で別途反映する必要があります。

個別ユーザーのログイン機能・アクセス制御は実装していません(理由は要件定義書2.3・第5章を参照)。

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [要件定義書](./docs/要件定義書.md) | 背景・目的・機能要件・非機能要件 |
| [設計書](./docs/設計書.md) | DB設計・画面設計・Markdown編集機能の設計・API設計・デプロイ構成 |
| [develop.md](./docs/develop.md) | 開発中の調査・学習内容・設計判断・トラブルシューティングの記録 |
| [vercel-learning.md](./docs/vercel-learning.md) | Vercelの仕組み(自動デプロイ、Serverless、Neon等)に関する学習まとめ |
| [auth-learning.md](./docs/auth-learning.md) | 一般的な認証(User/Session/Cookie等)の仕組みに関する学習記録(本システムには未実装) |

## 既知の制約

- 個別ユーザーのログイン機能・アクセス制御は実装していません(著者記録はUser選択式で代替)。理由の詳細は要件定義書・想定問答集を参照してください
- 改訂間の差分表示・バージョンロールバックは未実装です
- 同時編集の競合制御(楽観的ロック等)は未実装です
- Gamma API連携は実際のAPI呼び出しを検証しておらず、モック実装(`MockGenerator`)で動作確認しています

いずれも本番導入時の拡張候補として設計書に記載しています。
