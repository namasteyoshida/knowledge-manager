import { prisma } from "@/lib/prisma";
import { PageForm } from "../PageForm";

export default async function NewPage() {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">記事を作成</h1>
      <PageForm users={users} />
    </div>
  );
}