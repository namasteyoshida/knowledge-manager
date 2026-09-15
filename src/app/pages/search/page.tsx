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

  let pages: Awaited<ReturnType<typeof fetchMatchedPages>> = [];
  if (query) {
    pages = await fetchMatchedPages(query);
  }

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

// 「タイトル」または「最新Revisionの本文」に一致する記事のみを検索対象とする。
// Prismaの標準的なwhere句だけでは「各Pageの最新Revisionに限定した検索」を
// 直接表現できないため、対象記事(削除済みを除く)を最新Revision付きで取得した上で、
// アプリケーション側でタイトル・最新本文への部分一致を判定する。
async function fetchMatchedPages(query: string) {
  const lowerQuery = query.toLowerCase();

  const candidates = await prisma.page.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: {
      revisions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { author: true },
      },
    },
  });

  return candidates.filter((page) => {
    const latestContent = page.revisions[0]?.content ?? "";
    return (
      page.title.toLowerCase().includes(lowerQuery) ||
      latestContent.toLowerCase().includes(lowerQuery)
    );
  });
}