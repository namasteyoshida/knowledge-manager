# Vercelについての理解まとめ

## 1. Vercelとは

Vercelは、Next.jsなどのWebアプリをインターネット上に公開・運用するためのプラットフォーム。

自分でサーバーを用意して、ビルド・起動・HTTPS・ドメイン・CDNなどを設定する作業を、Vercelがかなり自動化してくれる。

---

## 2. 自動デプロイ

GitHubとVercelを連携すると、GitHubへのpushをきっかけに自動でデプロイできる。

```text
git push origin main
        ↓
GitHubのmainが更新
        ↓
GitHubからVercelへWebhook通知
        ↓
Vercelが最新コードを取得
        ↓
依存関係をインストール
        ↓
ビルド
        ↓
デプロイ
```

### Webhookとは

「何かが起きたら、別のサービスにHTTPで通知する仕組み」。

Webhook自体がデプロイするわけではなく、GitHubからの通知を受けてVercelがデプロイ処理を開始する。

### Vercelを使わない場合

```text
サーバーを用意
↓
Node.jsを用意
↓
git pull
↓
pnpm install
↓
pnpm build
↓
pnpm start
```

さらにプロセス監視、環境変数、HTTPS、ドメインなども自分で管理する必要がある。

---

## 3. Node.jsとbuild / start

### Node.js

Node.jsは、JavaScriptをブラウザ以外で実行するための実行環境。

Next.jsのアプリでは、Node.jsを使ってビルドしたり、アプリを動かしたりする。

### pnpm build

本番用にアプリをビルドする。

```text
pnpm build
↓
Node.jsを使ってビルド処理
↓
本番で動かせる状態のファイルを生成
```

### pnpm start

ビルド済みのNext.jsアプリを実際に起動する。

つまり、

```text
build = 本番用に準備する
start = 準備したアプリを実際に動かす
```

---

## 4. プロセス

プロセスとは「現在実行中のプログラム」。

例えば、

```text
pnpm start
```

でNext.jsを起動すると、そのNext.jsはプロセスとして動き続ける。

プロセスがクラッシュすると、アプリも停止する。

そのため従来のサーバー運用では、PM2やsystemd、Docker、Kubernetesなどを使ってプロセスを監視・再起動することがある。

---

## 5. 環境変数

環境変数は、アプリの設定値などをソースコードに直接書かずに外部から渡すための仕組み。

例えば、

```env
DATABASE_URL="postgresql://..."
```

Node.jsからは、

```ts
process.env.DATABASE_URL
```

で取得できる。

Vercelでは、プロジェクトの設定から環境変数を登録できる。

---

## 6. HTTPS

HTTPSは、ブラウザとサーバーの通信を暗号化して安全にする仕組み。

```text
ブラウザ
   ↓ HTTPS
サーバー
```

TLSという仕組みを使って通信を暗号化する。

TLS証明書には、どのドメイン向けの証明書なのかという情報が含まれている。

### HTTPSとドメインは別物

```text
ドメイン = どこにアクセスするか
HTTPS   = その通信を安全に行う
```

Vercelでは、カスタムドメインを設定するとHTTPSの設定などをかなり自動化できる。

Vercelを使わない場合は、Let's Encryptなどで証明書を取得し、Webサーバーに設定して更新も管理する必要がある。

---

## 7. ドメインとDNS

例えば、

```text
https://example.com/books/123
```

の場合、

```text
https://       → プロトコル
example.com    → ドメイン
/books/123     → パス
```

### IPアドレス

サーバーはIPアドレスで通信する。

```text
example.com
      ↓ DNS
123.45.67.89
```

DNSは、ドメイン名と接続先を対応させる仕組み。

### Aレコード

ドメインをIPv4アドレスに対応させる。

```text
example.com → 123.45.67.89
```

### CNAME

あるホスト名を別のホスト名に対応させる。

```text
www.example.com → example.vercel.app
```

---

## 8. CDN

CDNは、世界各地にあるサーバーを使ってコンテンツをユーザーの近くから配信する仕組み。

例えば日本のユーザーがアメリカのサーバーまで毎回アクセスするより、日本に近いCDNの拠点から配信した方が速くなる場合がある。

```text
ユーザー
   ↓
近くのCDN
   ↓
必要に応じて元のサーバー
```

画像、JavaScript、CSS、フォントなどの静的ファイルはCDNでキャッシュされることが多い。

### キャッシュ

一度取得したデータを一時的に保存して、次回以降のアクセスで再利用する仕組み。

CDNは「公開されたコンテンツを速く届ける」ための仕組み。

---

## 9. Serverless / Functions

Serverlessは「サーバーが存在しない」という意味ではない。

**サーバーの管理を自分で行わなくてよい**という考え方。

例えばNext.jsのAPI Route：

```text
src/app/api/users/route.ts
```

に、

```ts
export async function GET() {
  // 処理
}
```

を書くと、この処理をVercelのFunctionとして実行できる。

イメージ：

```text
ブラウザ
   ↓ GET /api/users
Vercel
   ↓
Functionが実行
   ↓
DB
   ↓
JSONを返す
```

従来のサーバーでは、Next.jsのプロセスを常に起動してリクエストを待ち受ける。

Serverlessでは、**リクエストが来た瞬間にVercelが必要な分だけ一時的に実行環境を立ち上げ、処理が終わると破棄する**。「常駐せず、必要な時だけ動く」という点が、サーバーレスと呼ばれる所以である。

### 注意点

Serverlessにも実行時間などの制限があり、長時間動き続ける処理などには向かない場合がある。

**本プロジェクトとの関連**:Gamma連携で実装した`requestGammaGeneration`は、DBへのリクエスト登録後、実際の生成処理(`processGeneration`)を`await`せずバックグラウンドで走らせる設計にしている。ローカル開発環境(`pnpm dev`)ではNode.jsプロセスが常駐しているため問題なく動作するが、**本番(Vercel)のServerless環境では、クライアントへのレスポンスを返した後もバックグラウンド処理が継続される保証がない**(Functionの実行自体が終了とみなされ、途中で処理が打ち切られる可能性がある)という制約がある。もし本番で実際にGamma APIと連携する場合は、Vercelの`waitUntil()`(レスポンス後も処理継続を明示的に指示する仕組み)を使う、または外部のジョブキューサービスに処理を委譲するといった設計変更が必要になる。今回はモック実装(数秒の遅延のみ)のため実害はないが、本番切り替え時に見直すべき論点として認識しておく。

---

## 10. Preview環境

Preview環境は、本番公開する前に実際のインターネット上で変更内容を確認するための環境。

例えば、

```text
main
 ↓
本番環境

feature/login
 ↓
Preview環境
```

featureブランチをGitHubにpushすると、VercelがPreview環境を作ってURLを発行できる。

```text
feature/login
      ↓
GitHub
      ↓
Vercel
      ↓
Preview URL
      ↓
動作確認
      ↓
問題なければmainへmerge
      ↓
本番デプロイ
```

### Local / Preview / Production

```text
Local
localhost:3000
自分のPCで開発

Preview
Vercel上のテスト環境
本番前の確認

Production
Vercel上の本番環境
実際のユーザーが利用
```

Preview環境があることで、「自分のPCでは動いたけど、デプロイしたら動かなかった」という問題を本番公開前に確認できる。

---

# 11. データベースとNeon

ここは「PostgreSQL」と「Neon」を分けて考える。

## PostgreSQL

PostgreSQLはデータベースの種類・ソフトウェア。

開発環境では、例えばDockerの中でPostgreSQLを動かせる。

```text
Next.js
   ↓
Prisma
   ↓
Docker上のPostgreSQL
```

## Neon

Neonは、クラウド上でPostgreSQLを提供してくれるサービス。

本番環境では、

```text
Vercel
  ↓
Next.js
  ↓
Prisma
  ↓
Neon
  ↓
PostgreSQL
```

という構成にできる。

つまり、

**Neon = PostgreSQLとは別のデータベース種類**

ではない。

**NeonがPostgreSQLをクラウド上で提供している**

と考える。

---

## 12. なぜ開発環境と本番環境で違うのか

開発環境：

```text
Next.js
  ↓
Prisma
  ↓
自分のDocker上のPostgreSQL
```

本番環境：

```text
Next.js（Vercel）
  ↓
Prisma
  ↓
Neonが提供するPostgreSQL
```

変わっているのは、主に

**「PostgreSQLをどこで動かしているか」**

という点。

Prismaから見れば、どちらもPostgreSQLなので、基本的な構成は同じ。

---

## 13. なぜNeonだったのか

VercelではNeonしか使えないわけではない。

PostgreSQLを提供するサービスには、

- Neon
- Supabase
- Amazon RDS
- Google Cloud SQL
- Azure Database for PostgreSQL
- 自分でサーバーを用意する方法

などがある。

Neonが手軽だった理由は、

- PostgreSQLをクラウドで利用できる
- DBサーバーそのものを自分で管理しなくてよい
- Vercelから接続しやすい
- PostgreSQLなので、現在のPrisma構成を大きく変えなくてよい

という点。

そのため個人開発では、

```text
開発環境
Next.js → Prisma → Docker上のPostgreSQL

本番環境
Next.js → Prisma → Neon上のPostgreSQL
```

という構成にしやすい。

---

# 14. Vercelを使うことで何が楽になるのか

Vercelを使わない場合、自分で管理する範囲がかなり広い。

```text
サーバー
Node.js
プロセス管理
デプロイ
HTTPS
ドメイン設定
CDN
環境変数
Preview環境
ログ・監視
```

Vercelを使うと、これらの多くをプラットフォーム側に任せられる。

```text
GitHub
   ↓
Vercel
   ├─ 自動デプロイ
   ├─ Preview環境
   ├─ HTTPS
   ├─ CDN
   ├─ Functions
   └─ その他の運用機能
          ↓
       Neon
          ↓
      PostgreSQL
```

---

# 15. 全体像

今回学んだ内容を大きく分けると、

### 「コードを公開する」

```text
GitHub
  ↓
Vercel
  ↓
Next.js
```

### 「速く安全に届ける」

```text
Vercel
 ├─ CDN → 高速配信
 ├─ HTTPS → 安全な通信
 └─ Domain / DNS → URLでアクセス
```

### 「サーバー側の処理を動かす」

```text
Vercel
  ↓
Functions
  ↓
処理
```

### 「データを保存する」

```text
Vercel
  ↓
Next.js / Prisma
  ↓
Neon
  ↓
PostgreSQL
```

### 「本番前に確認する」

```text
GitHubのfeatureブランチ
        ↓
Vercel Preview
        ↓
動作確認
        ↓
mainへmerge
        ↓
Production
```

---

# 最重要ポイント

Vercelを理解するときは、

> **「Vercelが全部やってくれる」**

ではなく、

> **「本来自分で管理していたWebアプリの運用作業を、Vercelがまとめて管理してくれる」**

と考えると分かりやすい。

また、Neonについては、

> **PostgreSQLをやめてNeonにした**

ではなく、

> **開発環境では自分のDockerでPostgreSQLを動かし、本番環境ではNeonが提供するPostgreSQLを使う**

という違い。

---

# 16. なぜ本プロジェクトはVercelを選んだのか(結論)

ここまでの理解を踏まえ、本プロジェクトでVercelを選定した理由を整理する。

10日間という開発期間の中で、上記(自動デプロイ、HTTPS、ドメイン、CDN、Preview環境、Functions、環境変数管理)を全て自前で構築する時間的余裕はなかった。Vercelを使うことで、これらのインフラ管理をほぼ意識せず、アプリケーションロジックの実装に集中できる。

加えて、以下の技術的な整合性も選定理由になっている。

- Next.jsの開発元自身が提供するプラットフォームであるため、Server Components・Server Actions等、本プロジェクトで採用している技術が追加設定なしにそのまま動作する
- GitHubリポジトリとの連携により、mainブランチへのpushで自動デプロイ、featureブランチのPRごとにPreview環境が自動生成されるため、動作確認のたびに手動でデプロイし直す必要がない
- 認証機能を実装しない代わりのアクセス制御として、Vercelの「Deployment Protection」(簡易パスワード保護・アクセス要求フロー)をそのまま活用できる

一方で、Serverlessという実行モデル特有の制約(9章で触れた実行時間制限)は、Gamma連携のような非同期バックグラウンド処理を本番で実際に動かす際には設計上の考慮が必要になる点として認識している。今回はモック実装のため実害はないが、「Vercelを選んだことによるメリットだけでなく、アーキテクチャ上のトレードオフ関係が生まれるがそれに対応する方法も存在する」と理解した
