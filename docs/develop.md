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

### feature/search
**メインロジック**
- 検索ボックス(SearchBox.tsx)はClient Componentとして実装し、useStateで入力値を保持、送信時にrouter.push(/pages/search?q=${encodeURIComponent(query)})で検索結果ページへ遷移する設計にした
- 検索結果自体の取得・表示はServer Component(search/page.tsx)側で行い、URLのクエリパラメータ(searchParams)経由で検索キーワードを受け取る構成。これにより、入力操作(Client Component)と実際のデータ取得(Server Component)の役割を分離している
- 検索条件はOR: [{ title: { contains: query, mode: "insensitive" } }, { revisions: { some: { content: { contains: query, mode: "insensitive" } } } }]とし、タイトル・本文(いずれかのRevision)のどちらかに一致すればヒットする設計。過去の改訂内容に一致した場合でも、記事自体(最新の状態)がヒットしたものとして一覧に表示される

**設計判断:HTML標準form送信との比較検討**
- 検索フォームの実装方式として、①Client Component + router.pushによるクライアントサイド遷移と、②HTML標準の<form action="..." method="GET">によるブラウザ標準送信の2案を比較検討した
- 機能要件(単純なキーワード送信と画面遷移)だけを見れば②の方がシンプルで、JavaScript不要・コード量も少なく済むという結論に至った
- 最終的には①を採用。理由は、他の画面遷移(<Link>を使ったクライアントサイドナビゲーション)との一貫性を保てること、将来的にリアルタイムサジェスト等の機能を拡張しやすいことの2点。「必要最小限か」という観点では②が優れるが、「将来の拡張性」を重視して①を選んだという、トレードオフを踏まえた判断
**トラブルシューティング**
- 検索してもヒットしない不具合が発生。切り分けのためconsole.logでデバッグしたが、当初出力が確認できなかった。原因はデバッグログを追加したファイルのフォルダ名を誤っていたためで、単純な作業ミスだった
- Prisma Studio上で同条件のデータ絞り込みができることを確認し、データ自体やDB接続には問題がないことを先に切り分けてから、コード側(クエリの組み立て・パラメータの受け渡し)の調査に進むという手順を踏んだ
**運用ミス:developブランチで直接作業してしまった件**
- 検索機能一式の実装・コミットを、誤ってfeature/searchではなくdevelopブランチ上で直接行ってしまった
- リモート(origin/develop)へは未pushの状態だったため、以下の手順で復旧した
- 今のdevelop(コミット済みの変更を含む)からfeature/searchブランチを新規に切る(git checkout -b feature/search)。これにより変更内容はそのまま新しいブランチに引き継がれる
- developに戻り、git reset --hard origin/developでリモートの状態に強制的に巻き戻す(ローカルのみの変更を破棄)
feature/searchをリモートにpush

## 2026-09-09(Day4)

### feature/document-template

**設計の変遷**

1. 当初、資料構成支援機能はGamma連携(ストレッチ機能)の入力補助として着想したが、Gamma自体が「テキストを入力するだけで自動構成する」機能を持つため、独自のテンプレート編集UIを作り込むことの投資対効果を再検討した
2. MVPとストレッチを切り分け、「テンプレート入力→保存・表示までを行う機能(13-1)」をMVP必須、「Gamma連携(13-2)」をストレッチとする方針を決定
3. 画面設計段階では仮の4セクション(概要/背景/詳細/まとめ)でワイヤーフレーム・API設計を先行させた
4. 実際の業務利用を想定し、より実用的な5セクション構成(結論/背景・課題/原因・ポイント/対応方法・手順/注意点・まとめ)に内容を作り込み直した
5. 「入力し始めたら例文が自動で消える」「テンプレートを使わない人にも配慮したい」という希望から入力方式を検討し、方法A(セクションごとの入力欄+HTML標準`placeholder`)と方法B(1つのエディタ+挿入ボタン)を比較。自動消去が可能な方法Aを採用し、「使わない人向け」への配慮は"モード切り替え"(`NewPageSwitcher`)で解決する方針に決定
6. `/pages/new-from-template`という専用ページは廃止し、`/pages/new`に「自由入力」「テンプレート入力」の切り替えとして統合
7. プレビュー機能追加時、保存用ロジックとプレビュー用ロジックが将来ズレるリスクを避けるため、Markdown組み立て処理を`composeTemplateMarkdown`として`lib/`配下に共通化

**メインロジック**

- `composeTemplateMarkdown`:5つのセクション値を受け取り、見出し付きMarkdown文字列1本に組み立てる純粋関数。サーバー側の保存処理(`createPageFromTemplate`)とクライアント側のプレビュー処理の両方から呼ばれる、単一の情報源として設計
- `createPageFromTemplate`は内部で`composeTemplateMarkdown`→`createPage`(自由記述と共通のServer Action)という順に処理を委譲する構成。「保存」より後ろの処理は自由記述モードと完全に共通

**リファクタリング:Markdown編集機能の再設計(react-hooks/refs対応)**

- 発端:テンプレートの5セクションにツールバーを追加する際、`useMarkdownToolbar`というカスタムフックで`ref`と`insertSyntax`を返す設計にしたところ、`react-hooks/refs`というESLintルールに抵触した
- 原因分析:「`ref`を保持するロジック(フック)」と「そのrefを使うUI(textarea)」が別コンポーネントに分かれ、`insertSyntax`がコンポーネントをまたいで渡されることで、ESLintの静的解析が安全性を追跡できなくなっていた
- 誤った対処の経緯:最初にclaudeに「`useCallback`で包めば解決する」という説明を受けたが誤りだった(`useCallback`は関数の再生成を防ぐだけで、ref参照の構造自体は変わらない)。chatGPTへの確認により誤りを認識し、方針を修正した
- 採用しなかった対処:ESLint抑制コメントによる警告の無効化は構造上の問題を覆い隠すだけであり根本対応にならないため不採用
- 最終設計:`ref`・`textarea`・挿入処理(`useCallback`で定義)を`MarkdownField`という1つのコンポーネントに閉じ込め、`MarkdownToolbar`へは「ローカルで定義したコールバック関数」を渡す構成に変更。Reactで最も標準的な「親から子へイベントハンドラを渡す」パターンであり、ESLintの静的解析とも整合する
- 責務分担を明確化:`MarkdownToolbar`(ボタン表示+通知のみ)/`MarkdownField`(textarea+ref+挿入処理)/`MarkdownPreview`(Markdown→HTML変換+表示)の3コンポーネントに整理。自由記述モード(`PageForm`)とテンプレートモード(`DocumentTemplateForm`、5セクション分)の両方で同じ3コンポーネントを再利用する構成にした
- 文字列操作ロジック(`applyMarkdownSyntax`)をDOM操作から分離し、`lib/markdownSyntax.ts`に純粋関数として切り出した

---

## 2026-09-09(Day5):Vercelデプロイ

### mainブランチへのマージ(インシデント対応)

**問題**

- develop→mainのPR作成時、コンフリクトが発生し「This branch has conflicts that must be resolved」と表示されマージできなかった
- 原因は、以前(Day3)の「feature/page-detailを誤ってmainにマージし、`git revert -m 1`で打ち消した」事故により、main側の該当ファイル(`page.tsx`, `actions.ts`等)が古い状態のまま止まっていたこと。developはその後も機能追加を続けていたため、2つのブランチの履歴が食い違い、同一ファイルに対する矛盾した変更としてコンフリクトが発生した

**対応**

- `git merge develop`実行後、コンフリクトしたファイルに対して`git checkout --theirs <ファイル>`でdevelop側の内容を採用
- `git commit -m "..."`でマージコミットを確定(コンテナ内にエディタがないため`-m`オプションでメッセージを直接指定)
- `git push origin main`でリモートに反映

**学習内容**

- `git merge`時のコンフリクト解消で、`--theirs`(マージしようとしている側を採用)/`--ours`(現在のブランチ側を維持)というオプションで、ファイル単位で一括して解消方針を指定できる
- 過去の`revert`が、離れたタイミングで別のマージ作業に影響を及ぼすことがあるという教訓(mainとdevelopの乖離は早期に解消しておく方が望ましい)


**問題**

- develop→mainのPR作成時、コンフリクトが発生し「This branch has conflicts that must be resolved」と表示されマージできなかった
- 原因は、以前(Day3)の「feature/page-detailを誤ってmainにマージし、`git revert -m 1`で打ち消した」事故により、main側の該当ファイル(`page.tsx`, `actions.ts`等)が古い状態のまま止まっていたこと。developはその後も機能追加を続けていたため、2つのブランチの履歴が食い違い、同一ファイルに対する矛盾した変更としてコンフリクトが発生した

**対応**

- `git merge develop`実行後、コンフリクトしたファイルに対して`git checkout --theirs <ファイル>`でdevelop側の内容を採用
- `git commit -m "..."`でマージコミットを確定(コンテナ内にエディタがないため`-m`オプションでメッセージを直接指定)
- `git push origin main`でリモートに反映

**学習内容**

- `git merge`時のコンフリクト解消で、`--theirs`(マージしようとしている側を採用)/`--ours`(現在のブランチ側を維持)というオプションで、ファイル単位で一括して解消方針を指定できる
- 過去の`revert`が、離れたタイミングで別のマージ作業に影響を及ぼすことがあるという教訓(mainとdevelopの乖離は早期に解消しておく方が望ましい)

### Vercelへの初回デプロイ

**メインロジック・構成**

- ローカルの`DATABASE_URL`(Docker PostgreSQL)とVercel側の`DATABASE_URL`(Neon PostgreSQL)を、環境ごとに完全に分離する構成にした。ローカルの`.env`は変更せず、Vercel側の環境変数のみNeonの接続文字列を設定
- GitHubリポジトリとVercelを連携し、mainブランチへのpushで自動デプロイされる構成にした

**トラブルシューティング1:`Module not found`(Prisma Client生成漏れ)**

- Vercelのビルドが`src/lib/prisma.ts`のimport元(`@/generated/prisma/client`)を解決できず失敗
- 原因:`@prisma/client`のインストール時に`prisma generate`を自動実行する`postinstall`スクリプトが、pnpmのセキュリティ機構(ビルドスクリプトのブロック)によりVercel環境では実行されていなかった。ローカルでは`pnpm approve-builds --all`を既に実行済みだったため気づきにくかった
- 対応:`package.json`の`build`コマンドを`"next build"`から`"prisma generate && next build"`に変更し、ビルドのたびに明示的にPrisma Clientを生成するようにした

**トラブルシューティング2:`DriverAdapterError: TableDoesNotExist`**

- Prisma Client生成の問題を解消した後、今度は「Neon側にPageテーブルが存在しない」エラーが発生
- 原因:`schema.prisma`はDBの構造を定義するだけであり、実際にテーブルを作成するには`migrate`の適用が別途必要という原則が、「ローカルDBとNeon(本番用DB)という2つの独立したデータベース」という形で改めて表面化した。ローカルでは`migrate dev`を実行済みだったが、Neon側には一度も反映していなかった
- 対応:ターミナル上で一時的に`DATABASE_URL`をNeonの接続文字列に切り替え、`pnpm prisma migrate deploy`を実行(`migrate dev`ではなく、既存のマイグレーションファイルを本番へ適用する専用コマンドを使用)。適用後、正常にテーブルが作成され解消

**Deployment Protectionの実地確認**

- Vercelの「ログインが必要です」設定(Vercel Authentication)をONにし、第三者(友人)に本番URLを共有
- 友人がアクセスすると認証画面が表示され、アクセス要求→本人側での承認、というフローを実際に確認できた。要件定義書・設計書で想定していた「認証機能を実装しない代わりのアクセス制御」が、実際に機能することを検証できた

**今後の運用における注意点(学習内容としてまとめ)**

- `schema.prisma`を変更した際は、ローカルの`migrate dev`だけでなく、Neon(本番)側にも`migrate deploy`を忘れず適用する必要がある。特に今後のGamma連携(GenerationRequestテーブル追加)で同じ手順が必要になる
- 新しい環境変数(例:今後追加予定の`GAMMA_API_KEY`)は、ローカルの`.env`だけでなくVercel側のEnvironment Variablesにも同様に設定する必要がある
- 新しいnpmパッケージ追加時、`postinstall`等のビルドスクリプトに依存するパッケージだと、pnpmのセキュリティ機構により同様の問題が再発する可能性があるため、Vercel上のビルドログを都度確認する習慣が必要
- developへのマージだけではVercelに反映されない(Vercelが追跡しているのはmainブランチ)。develop→mainのマージを、ある程度まとまった単位で忘れずに行う運用を継続する

---

## 2026-09-11(Day6):Gamma連携(ストレッチ機能)

### 方針決定

**設計判断**

- Gamma APIの利用には有料プラン(Pro/Ultra/Teams/Business)が必要と判明。有料プランには加入せず、以下の方針で実装することを決定した
  - API連携を想定した設計・実装(テーブル、Server Action、ポーリング機構)は本物と同じ構造で作る
  - 実際のAPI呼び出しは`DocumentGenerator`インターフェースで抽象化し、動作確認用の`MockGenerator`で代替する
  - 実際の生成クオリティは、gamma.appの無料枠に手動でテキストを貼り付けて別途検証する

**Gamma API仕様調査の結果**

- 認証:`X-API-KEY`ヘッダーにAPIキーを設定
- 生成フロー:`POST /v1.0/generations`で生成開始→`generationId`取得→`GET /v1.0/generations/{generationId}`を5秒間隔でポーリング→`status`が`completed`になれば`gammaUrl`(閲覧リンク)・`exportUrl`(PDF/PPTX等)を取得
- このAPI設計が、以前設計していた`GenerationRequest`テーブルの`status`管理・ポーリング方式とほぼ一致しており、設計の妥当性を裏付ける結果となった

### メインロジック

**`DocumentGenerator`抽象化レイヤー**

- `DocumentGenerator`インターフェース(`generate(inputText): Promise<{ resultUrl }>`)を定義し、`MockGenerator`(3秒遅延+ダミーURL返却)と`GammaGenerator`(本物のAPI呼び出し、未検証の雛形)の2つの実装を用意
- 実際に使う実装は`document-generator/index.ts`の1行(`export const documentGenerator = new MockGenerator()`)で切り替えられる構成にした。将来有料プランを契約した場合、呼び出し側のコードを一切変更せずに本番切り替えが可能

**非同期処理の設計**

- `requestGammaGeneration`は、DBへのリクエスト登録(`status: PENDING`)のみを行い、実際の生成処理(`processGeneration`)は`await`せずに呼び出す設計にした。これにより、呼び出し元(クライアント)は生成完了を待たされず、即座に`requestId`を受け取れる
- `processGeneration`はバックグラウンドで`status`をPENDING→PROCESSING→COMPLETED/FAILEDと更新し続け、生成結果(`resultUrl`)またはエラー内容(`errorMessage`)をDBに書き込む
- クライアント側は`GammaGenerationButton`コンポーネントで2秒間隔のポーリング(`setInterval`)を行い、`useRef`でタイマーIDを保持してコンポーネントのアンマウント時に確実に`clearInterval`する設計にした(ポーリングの残留によるメモリリーク防止)

**確認ダイアログの追加**

- 要件定義書4.3(非機密情報を扱う運用ルール)を踏まえ、生成ボタン押下時に`window.confirm`で「機密情報が含まれていないか」の確認を挟む設計を追加した。削除ボタンと同じ、誤操作・不用意な実行防止の考え方を踏襲している

### 設計上の疑問への回答:GammaGenerator内のthrowは問題ないか

- 以前`createPage`等で「Server Actionからのthrowは本番ビルドでクライアントに伝わらない」問題を修正した経緯があったため、`GammaGenerator`内の`throw`も同様に問題にならないか確認した
- 結論:問題ない。`GammaGenerator.generate()`のthrowは、同じサーバープロセス内の`processGeneration`のtry/catchでのみ受け止められ、DBの`errorMessage`に書き込まれた後、Route Handler経由で正常なJSONレスポンスとしてクライアントに届く。クライアントの`try/catch`に直接届こうとする経路(以前問題になった構造)がそもそも存在しないため、throwのままで設計として適切と判断した

### 実機検証:gamma.app無料枠での手動確認

- 実際にシステムから送信されるであろう`inputText`(Markdown形式の記事本文)を、自由記述形式・5セクションテンプレート形式の2パターン用意し、gamma.appの無料枠に手動で貼り付けて検証した
- 見出し(`##`)・番号付き構成・箇条書きを含むテキストが、Gamma側で正しく構造化されたスライド/ドキュメントとして変換されることを確認した。前処理でMarkdown記号を除去する必要がないという設計上の判断が裏付けられた

---

## 2026-09-12(Day7):全体動作確認・ドキュメント最終化


### Vercelの仕組みに関する学習の言語化(vercel-learning.md)

- 自分でまとめたVercelの理解(自動デプロイ、Webhook、Node.jsのbuild/start、プロセス、環境変数、HTTPS、DNS、CDN、Serverless/Functions、Preview環境、Neon)をレビューした
- 補足した点:Serverlessの本質は「リクエストごとに一時的に実行環境が立ち上がり、処理後に破棄される」ことであり、これが本プロジェクトのGamma連携(`processGeneration`をawaitしないバックグラウンド処理)の設計と関連する重要な制約であることを整理した。本番でGamma実APIと連携する場合、Vercelの実行時間制限により処理が途中で打ち切られる可能性があり、`waitUntil()`や外部ジョブキューへの委譲が必要になるという学びを追記した
- 「なぜ本プロジェクトはVercelを選んだのか」という結論を、開発期間の制約・Next.jsとの技術的整合性・Deployment Protectionの活用という観点でまとめの最後に追加した
- `docs/vercel-learning.md`としてコミット

### 認証の仕組みに関する学習(認証の学習まとめ.md)

- 一般的な認証システム(User/Session/Cookie/パスワードハッシュ化/CSRF対策等)の仕組みをレビューした。技術的な誤りはなく、Cookie→Session→Userという3段階の関係、User IDを直接Cookieに入れない理由等、標準的な理解ができていることを確認した
- 補足した点:パスワードハッシュ化には`bcrypt`/`argon2`等、計算コストの高いアルゴリズムを使うべきこと、Session方式以外にJWT方式という選択肢もあること
- 本プロジェクトの`User`テーブルは認証情報を持たない設計になっているため、この学習内容はあくまで**将来の拡張知識**であり、今回は実装しない方針を再確認した

### 重要な方針転換:Vercel Authenticationの不採用

**経緯**

- 実際にVercel Authentication(Deployment Protection)を設定したところ、無料プランでは利用可能な人数が「自分ともう一名まで」に制限されることが判明した
- これは口頭ディフェンス当日、複数の評価者が同時にアクセスする場面には不向きであると判断した

**設計判断**

- ここでプロジェクトの目的そのものに立ち返って再検討した。本プロジェクトの主目的は「セキュアな本番システムを構築すること」自体ではなく、「実務で使われる技術・開発フローに関する知識と経験を得ること」にある
- この前提に立てば、「最低限のアクセス制御を設けられない」こと自体は本質的な問題ではないと判断し、Vercel Authenticationも不採用とした
- 課金してまで人数制限を解消する必要はなく、学習という主目的は既に達成されているという結論に至った
- なお、この「目的に立ち返った判断」という思想的な背景は、要件定義書等の正式な文書には明記せず、単に該当する記述(アクセス制御に関する言及)を削除するにとどめる方針とした

### ドキュメント全体の最終整合性チェック

**実施内容**

- 開発初期(要件定義書・設計書・README初版作成時点)から実装完了までの全会話を振り返り、初期の設計から実際に変更・進化した箇所を洗い出した
- 洗い出された変更点:
  - 資料構成支援のテンプレートが4セクション(概要/背景/詳細/まとめ)から5セクション(結論/背景・課題/原因・ポイント/対応方法・手順/注意点・まとめ)に変更され、専用ページ(`/pages/new-from-template`)から`/pages/new`内のモード切り替え方式に統合されていた
  - Markdown編集機能の内部構造が、当初想定の`useMarkdownToolbar`カスタムフックから、`MarkdownToolbar`/`MarkdownField`/`MarkdownPreview`の3コンポーネントに再設計されていた
  - Server Actionsのエラー通知方式が、`throw`から`return { error }`方式に変更されていた
  - Gamma連携(13-2)が、モック実装(`DocumentGenerator`抽象化+`MockGenerator`)として完了し、実API検証はgamma.app無料枠での手動確認で代替されていた
  - デプロイのビルドコマンドが`prisma generate && next build`に変更されていた
  - 認証・アクセス制御の方針(上記参照)
- これらの変更点を反映し、要件定義書・設計書・README・口頭ディフェンス想定問答集の4ファイルを最新の実装状態に合わせて全面的に更新した。特に設計書には、Markdown編集機能のコンポーネント設計(3章)、Server Actionsのエラー通知方式変更の経緯(5.2)、Gamma連携のVercel Serverless実行時間制約(5.4)を新設・追記した

**学習内容**

- ドキュメントは一度作って終わりではなく、実装が進むにつれて生じる設計変更を都度反映し、最終的に実装と文書の整合性を取る作業が必要になる。今回のように開発途中で複数回設計判断が変わるプロジェクトでは、要所要所でドキュメントの棚卸しを行うタイミングを設けることが重要だと学んだ