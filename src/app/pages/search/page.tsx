import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SearchBox } from "../SearchBox";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q ?? "";

  const pages = query
    ? await prisma.page.findMany({
        where: {
          deletedAt: null,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { revisions: { some: { content: { contains: query, mode: "insensitive" } } } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        include: {
          revisions: { orderBy: { createdAt: "desc" }, take: 1, include: { author: true } },
        },
      })
    : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">記事検索</h1>
      <div className="mb-6">
        <SearchBox defaultValue={query} />
      </div>

      {query && (
        <p className="mb-3 text-sm text-gray-500">
          「{query}」の検索結果:{pages.length}件
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {pages.map((page) => {
          const latest = page.revisions[0];
          return (
            <li key={page.id}>
              <Link
                href={`/pages/${page.id}`}
                className="block rounded-lg border border-gray-200 p-4 transition hover:border-gray-300 hover:bg-gray-50"
              >
                <p className="font-medium text-gray-900">{page.title}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {latest?.author.name ?? "不明"}・
                  {page.updatedAt.toLocaleDateString("ja-JP")}に更新
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      {query && pages.length === 0 && (
        <p className="text-sm text-gray-500">該当する記事が見つかりませんでした。</p>
      )}
    </div>
  );
}