import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { markdownToHtml } from "@/lib/markdown";

export default async function PageDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const page = await prisma.page.findUnique({
    where: { id },
    include: {
      revisions: {
        orderBy: { createdAt: "desc" },
        include: { author: true },
      },
    },
  });

  if (!page || page.deletedAt) {
    notFound();
  }

  const [latest] = page.revisions;
  const html = await markdownToHtml(latest.content);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{page.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            著者:{latest.author.name}・更新:{page.updatedAt.toLocaleDateString("ja-JP")}
          </p>
        </div>
        <a
          href={`/pages/${page.id}/edit`}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          編集
        </a>
      </div>

      <article
        className="prose prose-sm max-w-none border-y border-gray-200 py-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <h2 className="mt-8 mb-3 text-sm font-semibold text-gray-700">改訂履歴</h2>
      <table className="w-full text-sm">
        <tbody>
          {page.revisions.map((rev) => (
            <tr key={rev.id} className="border-b border-gray-100">
              <td className="py-2 text-gray-500">
                {rev.createdAt.toLocaleString("ja-JP")}
              </td>
              <td className="py-2 text-gray-900">{rev.author.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}