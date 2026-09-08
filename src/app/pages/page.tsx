import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SearchBox } from "./SearchBox";

export default async function PageList() {
  const pages = await prisma.page.findMany({
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">記事一覧</h1>
        <Link
          href="/pages/new"
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700"
        >
          + 新規作成
        </Link>
      </div>

      <div className="mb-6">
        <SearchBox />
      </div>

      <ul className="flex flex-col gap-3">
        {pages.map((page) => {
          const latestRevision = page.revisions[0];
          return (
            <li key={page.id}>
              <Link
                href={`/pages/${page.id}`}
                className="block rounded-lg border border-gray-200 p-4 transition hover:border-gray-300 hover:bg-gray-50"
              >
                <p className="font-medium text-gray-900">{page.title}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {latestRevision?.author.name ?? "不明"}・
                  {page.updatedAt.toLocaleDateString("ja-JP")}に更新
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      {pages.length === 0 && (
        <p className="text-sm text-gray-500">まだ記事がありません。</p>
      )}
    </div>
  );
}