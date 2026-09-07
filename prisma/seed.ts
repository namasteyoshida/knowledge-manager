import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 既存データを削除(子テーブル → 親テーブルの順に消すこと)
  await prisma.revision.deleteMany();   // 1. まずRevision(PageとUserの両方を参照)
  await prisma.page.deleteMany();       // 2. 次にPage(Revisionから参照されなくなった)
  await prisma.user.deleteMany();       // 3. 次にUser(Revisionから参照されなくなった)
  await prisma.department.deleteMany(); // 4. 最後にDepartment(Userから参照されなくなった)

    const department1 = await prisma.department.create({
    data: { name: 'HR企画部' },
  });
    const department2 = await prisma.department.create({
    data: { name: 'マネジメント企画部' },
  });
    const department3 = await prisma.department.create({
    data: { name: 'カスタマーサポート部' },
  });
    const department4 = await prisma.department.create({
    data: { name: 'エンタープライズシステム推進部' },
  });
    const department5 = await prisma.department.create({
    data: { name: 'リテールデジタル推進部' },
  });
    const department6 = await prisma.department.create({
    data: { name: 'デジタルプラットフォーム推進部' },
  });
    const department7 = await prisma.department.create({
    data: { name: 'ビジネスインテリジェンス推進部' },
  });
    const department8 = await prisma.department.create({
    data: { name: 'DXインテグレーション推進部' },
  });
    const department9 = await prisma.department.create({
    data: { name: 'BizDev推進部' },
  });
    const department10 = await prisma.department.create({
    data: { name: 'セールスマーケティング部' },
  });

  // ユーザーを部署につき1人ずつ作成
  const user1 = await prisma.user.create({
    data: { name: '田中 花子', departmentId: department1.id },
  });
  const user2 = await prisma.user.create({
    data: { name: '佐藤 一郎', departmentId: department2.id },
  });
  const user3 = await prisma.user.create({
    data: { name: '鈴木 次郎', departmentId: department3.id },
  });
  const user4 = await prisma.user.create({
    data: { name: '高橋 美咲', departmentId: department4.id },
  });
  const user5 = await prisma.user.create({
    data: { name: '伊藤 健太', departmentId: department5.id },
  });
  const user6 = await prisma.user.create({
    data: { name: '渡辺 真由', departmentId: department6.id },
  });
  const user7 = await prisma.user.create({
    data: { name: '山本 大輔', departmentId: department7.id },
  });
  const user8 = await prisma.user.create({
    data: { name: '中村 悠斗', departmentId: department8.id },
  });
  const user9 = await prisma.user.create({
    data: { name: '小林 彩', departmentId: department9.id },
  });
  const user10 = await prisma.user.create({
    data: { name: '加藤 亮', departmentId: department10.id },
  });

  // 記事(Page)+初回改訂(Revision)を5件作成
  await prisma.page.create({
    data: {
      title: '新入社員研修の振り返り',
      revisions: {
        create: {
          authorId: user1.id,
          content:
            '## 概要\n4月に実施した新入社員研修の振り返り。\n\n## まとめ\n来年度も同カリキュラムを継続する方向。',
        },
      },
    },
  });

  await prisma.page.create({
    data: {
      title: '問い合わせ対応マニュアル',
      revisions: {
        create: {
          authorId: user3.id,
          content:
            '## 概要\nカスタマーサポート窓口での一次対応の流れ。\n\n## 手順\n1. 問い合わせ内容の一次切り分け\n2. FAQで解決可能か確認\n3. 解決しない場合はエスカレーション',
        },
      },
    },
  });

  await prisma.page.create({
    data: {
      title: '基幹システム刷新プロジェクト報告',
      revisions: {
        create: {
          authorId: user4.id,
          content:
            '## 概要\n基幹システム刷新プロジェクトの進捗報告。\n\n## 詳細\n要件定義フェーズが完了し、設計フェーズへ移行。',
        },
      },
    },
  });

  await prisma.page.create({
    data: {
      title: '店舗DX施策の効果検証',
      revisions: {
        create: {
          authorId: user5.id,
          content:
            '## 概要\n店舗向けに導入したデジタル施策の効果測定結果。\n\n## 詳細\n導入店舗では来店客の滞在時間が平均1.3倍に増加。',
        },
      },
    },
  });

  await prisma.page.create({
    data: {
      title: '全社データ活用ダッシュボード運用ガイド',
      revisions: {
        create: {
          authorId: user7.id,
          content:
            '## 概要\n全社向けデータダッシュボードの見方・運用ルール。\n\n## 詳細\n各部門は月次でKPIシートを更新すること。',
        },
      },
    },
  });

  console.log('シードデータの投入が完了しました');
  console.log('部署: 10件 / 社員: 10件 / 記事: 5件 / 改訂: 5件');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });