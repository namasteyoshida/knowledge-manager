import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageForm } from "../../PageForm";

export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [page, users] = await Promise.all([
    prisma.page.findUnique({
      where: { id },
      include: { revisions: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!page || page.deletedAt) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">記事を編集</h1>
      <PageForm
        mode="edit"
        pageId={page.id}
        title={page.title}
        initialContent={page.revisions[0].content}
        users={users}
      />
    </div>
  );
}