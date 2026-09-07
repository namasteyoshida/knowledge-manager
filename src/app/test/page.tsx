// app/test/page.tsx
import { prisma } from "@/lib/prisma";
import { TestCreateButton } from "./TestCreateButton";

export default async function TestPage() {
  const firstUser = await prisma.user.findFirst();

  if (!firstUser) {
    return <p>テスト用のUserが見つかりません。シードデータを投入してください。</p>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>createPage 動作確認用ページ</h1>
      <p>著者として使うユーザー: {firstUser.name}(id: {firstUser.id})</p>
      <TestCreateButton authorId={firstUser.id} />
    </div>
  );
}