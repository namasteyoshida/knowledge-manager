# 開発記録(develop.md)

本ファイルは、実装を進める中で調査した内容・学習内容・各機能のメインロジック・設計判断・トラブルシューティングを記録する開発ログである。以後、プルリクエストのdescriptionではなく本ファイルに追記していく形で運用する。

---

## 2026-09-07(Day1〜2):環境構築・DBスキーマ・記事CRUD基盤

### 環境構築

**学習内容・調査した内容**
- pnpmの導入(corepack経由)と、`pnpm approve-builds`によるビルドスクリプト許可の仕組み
- `create-next-app`が自動生成する`AGENTS.md`/`CLAUDE.md`:AIコーディングツールに最新のNext.js仕様を確認させるためのファイルと判明し、プロジェクトでは不要と判断し削除
- Prisma 7のシード実行方式の変更:`package.json`の`"prisma": { "seed": ... }`は廃止され、`prisma.config.ts`の`migrations.seed`に一元化。`migrate dev`時の自動シードも廃止され、`prisma db seed`の明示実行が必要
- `@default(cuid())`の意味と設計上の理由:連番ID(autoincrement)は次のIDを推測されやすく、認証機能を持たない本システムではURLから他レコードの存在を推測されるリスクがある。cuidはランダム性が高く、かつDBに問い合わせずアプリ側で値を生成できる点で採用
- `prisma generate`(型定義の更新のみ)と`migrate dev`(DB反映+型定義更新)の役割の違い
- `prisma.user`等の実体:`schema.prisma`の`model`定義をもとに`generate`時に自動生成される、テーブルごとの操作用オブジェクト。命名はモデル名のキャメルケース化(`User`→`user`)
- Next.js 15以降、`params`がPromiseとして渡される仕様変更(`await params`が必要)
- 開発サーバーのプロセスキャッシュ:`globalThis`にキャッシュされた`PrismaClient`インスタンスは、スキーマ変更後も**プロセスを再起動しない限り古いまま**保持され続ける

**メインロジック・設計**
- DBスキーマをMVP相当の4テーブル(Department, User, Page, Revision)で構成。ストレッチ機能用のTag・GenerationRequestは後日追加する方針とし、最初から全テーブルを作らず必要なタイミングで段階的にスキーマを拡張するという方針を採用
- Departmentを独立テーブルとした設計ロジック:Userに部署名を文字列で直接持たせると、部署名変更のたびに該当社員全レコードの更新が必要になる。Departmentを介した正規化により、部署名の変更を1レコードの更新で完結させ、組織変更(部署名変更・統廃合)への耐性を持たせている

### feature/seed-data

**メインロジック**
- 削除→作成の順序ロジック:外部キー制約があるテーブルは、参照している子テーブルから先に削除する必要がある。依存関係(`Revision→Page`, `Revision→User`, `User→Department`)を踏まえ、`Revision→Page→User→Department`の順で削除してから、逆順(`Department→User→Page→Revision`)で作成する構成にした。これにより、開発中に何度実行してもデータが重複しない冪等なシードスクリプトを実現している
- `Department`は`upsert`(なければ作成、あれば何もしない)で扱う設計も検討したが、最終的には削除→再作成方式に統一し、シードスクリプト全体のロジックをシンプルに保っている

**トラブルシューティング**
- `EACCES: prisma/seed.ts`:`prisma.config.ts`の`seed`フィールドに`tsx`コマンドの指定が抜けており、`.ts`ファイルを直接実行しようとしていたことが原因。`"tsx prisma/seed.ts"`に修正

### feature/create-page

**メインロジック**
- `createPage(title, content, authorId)`は、Prismaのネストしたcreate構文(`revisions: { create: { content, authorId } }`)を使い、**Page本体の作成と初回Revisionの作成を1つのSQLトランザクションとして実行**している。これにより「Pageは作られたのにRevisionは作られなかった」という中途半端な状態(整合性の破綻)を防いでいる
- `lib/prisma.ts`は、`globalThis`にPrismaClientインスタンスをキャッシュする実装(`globalForPrisma.prisma ?? new PrismaClient(...)`)にしている。Next.jsの開発モードではホットリロードのたびにモジュールが再評価されるため、キャッシュなしでは`new PrismaClient()`が繰り返し呼ばれ、DB接続が際限なく増えてしまう。`NODE_ENV !== 'production'`の場合のみグローバルにキャッシュすることで、開発時の接続過多を防ぎつつ、本番環境では毎回新しいインスタンスを使う設計にしている

**トラブルシューティング**
- スキーマ変更後に開発サーバーを再起動していなかったことによる`Cannot read properties of undefined (reading 'findFirst')`エラーを、プロセス再起動で解消

### feature/page-list

**メインロジック**
- 一覧表示に必要なのは各記事の「最新の」著者・更新内容のみであるため、`include: { revisions: { orderBy: { createdAt: "desc" }, take: 1, include: { author: true } } }`という書き方で、**改訂履歴全件ではなく最新の1件だけを、記事ごとに1回のクエリでまとめて取得**している。これにより「記事の数だけ追加クエリが発生する」といったN+1問題を避けている
- 論理削除された記事は`where: { deletedAt: null }`で一覧から除外するロジックを、この時点から一貫して適用している

### feature/page-detail

**メインロジック**
- Markdown→HTML変換は、`unified().use(remarkParse).use(remarkRehype).use(rehypeSanitize).use(rehypeStringify).process(markdown)`という**パイプライン構成**で実装。各`.use()`が「Markdown文字列→AST→HTML用AST→サニタイズ済みAST→HTML文字列」という変換の1段階ずつを担っており、途中に`rehypeSanitize`を挟むことで、変換過程で危険なタグ・属性を機械的に除去している(XSS対策)
- 変換後のHTMLは`dangerouslySetInnerHTML`でReactに描画させている。名前の通り本来危険な操作だが、直前でサニタイズ済みであるため、設計上リスクを許容できる状態にした上で使用している
- DBには常にMarkdown文字列(変換前)を保存し、HTML化は都度の閲覧時に行う設計とすることで、編集画面に戻す際にHTML→Markdownの逆変換を行う必要がない構成にしている

**学習内容**
- 同様の変換処理(Markdown→HTML)は、VSCodeの`.md`プレビュー機能(`markdown-it`使用)やGitHubのREADME表示でも行われており、使用ライブラリは異なっても処理の本質は共通していることを確認
- Tailwind CSS v4の`@plugin`ディレクティブ:v3までの`tailwind.config.js`での`plugins`指定から、v4ではCSSファイル内の`@plugin "@tailwindcss/typography";`という記法に変更されている

**トラブルシューティング**
- 未使用変数(`const [latest, ...history] = page.revisions`の`history`)の指摘・修正
- `params`非同期化への未対応によるバリデーションエラーを修正

---

## 2026-09-08(Day3):記事編集・削除・Markdown入力支援

### 運用ルールの見直し:Gitブランチの粒度

**学習内容**
- 実務では1PRあたりの変更量をレビュー可能な分量に抑えるのが一般的。当初`feature/article-crud`として一括りにする案を検討したが、実務の粒度を体験するため、機能ごとに`feature/create-page`, `feature/page-list`, `feature/page-detail`, `feature/edit-page`, `feature/delete-page`と細分化する方針に変更した

### インシデント対応:mainブランチへの誤マージ

**問題と対応**
- `feature/page-detail`のPR作成時、ベースブランチを`develop`ではなく`main`に指定してマージしてしまった
- `git revert -m 1 --no-edit <マージコミットのハッシュ>`でmain側のマージを打ち消し、改めて`feature/page-detail`→`develop`の正規PRを作成し直して解消

**学習内容**
- マージコミットは親を2つ持つため、`revert`時に`-m 1`(マージ前の状態を基準にする指定)が必須であること
- 再発防止として、GitHubのデフォルトブランチを`develop`に変更する案を検討

### インシデント対応:未コミット変更の消失

**問題と学習内容**
- 記事一覧ページをTailwindスタイルに変更した際、コミットしないまま次の作業に進んでしまい変更が失われた
- 「動作確認できた区切りごとに、こまめに`git add && git commit`する」ことの重要性を再確認し、以降はステップを細分化して都度コミットする運用に変更した

### feature/edit-page

**メインロジック**
- `updatePage(pageId, content, authorId)`は、`prisma.revision.create`で**新規Revisionを追記**し、`prisma.page.update`で`Page.updatedAt`のみを更新する、2段階の処理として実装している。Page本体(content)は持たないため、更新対象は常にRevisionテーブルへの追記になる
- `PageForm.tsx`は、`type Props = { mode: "create"; ... } | { mode: "edit"; ... }`というユニオン型で作成・編集を1コンポーネントに共通化している。`mode`の値によってタイトル入力欄の表示/非表示、`handleSubmit`内で呼び出す関数(`createPage`か`updatePage`か)を出し分けるロジックにしており、画面設計で決めた「作成・編集は同一コンポーネント」という方針をそのままコード構造に落とし込んでいる
- `createPage`に`revalidatePath("/pages")`を追加。Next.jsのServer Componentはデータをキャッシュするため、Server Action実行後に明示的に対象パスのキャッシュを再検証しないと、一覧画面に新しい記事が反映されない

**トラブルシューティング**
- `revalidatePath`のimport元が内部パス(`next/dist/server/...`)になっていたミスを、公式エントリポイント`next/cache`に修正
- `updatePage`に意図せず`title`引数が混入していた不整合を、設計通りcontent/authorIdの2引数に統一
- 空ファイルのままだった`[id]/edit/page.tsx`による`The default export is not a React Component`エラーを解消

### feature/delete-page

**メインロジック**
- `deletePage(pageId)`は、`prisma.page.update({ data: { deletedAt: new Date() } })`のみを行う。物理的な`delete`は一切呼ばず、**フラグを立てるだけ**という論理削除のロジックを徹底している。これにより、Revisionとのリレーションを壊さずに済み、改訂履歴も含めたデータが保持され続ける
- `DeleteButton.tsx`は`window.confirm`による確認ダイアログを挟んでから`deletePage`を呼ぶ設計。削除成功後は`router.push("/pages")`で一覧へ遷移し、`revalidatePath`により詳細ページ・一覧ページ両方のキャッシュを再検証している

**トラブルシューティング**
- JSXの`<a>`タグの開始タグが欠落し、閉じタグとの対応が崩れるビルドエラーが発生。タグを復元して解消
- 開発モード特有の`TypeError`(Next.js/Turbopack内部のパフォーマンス計測処理由来)を確認したが、アプリケーションコードに起因せず機能も正常動作していたため対応不要と判断

### feature/markdown-editor

**メインロジック(ツールバー)**
- `insertSyntax(before, after)`関数が中核ロジック。`textarea`要素の`selectionStart`/`selectionEnd`プロパティで**現在のカーソル位置、または選択範囲の開始・終了位置**を取得し、その位置を基準に文字列を3分割(選択範囲より前・選択されていた文字列・選択範囲より後)した上で、`before + 選択文字列 + after`を差し込んだ新しい文字列を組み立てて`setContent`している
- 見出し(`insertSyntax("## ")`)は`after`を渡さないことで「その場に挿入するだけ」の挙動に、太字(`insertSyntax("**", "**")`)は`before`と`after`両方を渡すことで「選択範囲を記号で挟む」挙動になる、という**1つの関数で複数の記法パターンに対応する設計**にしている
- 挿入後のカーソル位置の復元に`requestAnimationFrame`を使用している理由:`setContent`によるReactの再描画が完了する前にカーソル位置を操作しても、DOMがまだ古い内容のままのため正しく反映されない。次の描画フレームまで処理を遅らせることで、再描画後の新しいDOMに対して確実にカーソル位置を設定している

**メインロジック(リアルタイムプレビュー)**
- `useEffect`の依存配列に`content`を指定し、`content`が変わるたびにエフェクトを再実行。ただし`setTimeout`で300ms後に実行するようにし、エフェクトのクリーンアップ関数(`return () => clearTimeout(timer)`)で**直前のタイマーを毎回キャンセル**することで、デバウンス(入力が一定時間止まってから初めて処理を実行する仕組み)を実現している。1文字入力するたびに変換処理が走ることによる負荷を避ける狙い
- サーバー用に実装した`markdownToHtml`(非同期関数)を、Client Componentからそのまま呼び出している。DBアクセス等の副作用を持たない純粋な変換処理であるため、ブラウザ上で実行しても問題ない設計になっている

**学習内容(トラブルシューティングから)**
- 入力欄の縦幅調整は実装によるものではなく、ブラウザ標準の`<textarea>`が持つ`resize: both`のデフォルト挙動によるものだった
- ボタン幅の変化は、Tailwindのpreflight(リセットCSS)とブラウザ標準の`<button>`余白の適用状態の違いによるものと推測
- Safari/Chromeでの見た目の差は、開発サーバー再起動後もSafari側のタブが古いCSSをキャッシュしたままだったことが原因。「①ブラウザキャッシュ→②開発サーバー(`.next`)キャッシュ→③Prisma Clientの再生成」の順に疑うと切り分けが効率的、という教訓を得た
