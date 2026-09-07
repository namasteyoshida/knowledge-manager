// app/pages/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";

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
    <div style={{ padding: 24 }}>
      <h1>記事一覧</h1>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {pages.map((page) => {
          const latestRevision = page.revisions[0];
          return (
            <li key={page.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <Link href={`/pages/${page.id}`}>
                <p style={{ fontWeight: 600, margin: 0 }}>{page.title}</p>
              </Link>
              <p style={{ fontSize: 13, color: "#666", margin: "4px 0 0" }}>
                {latestRevision?.author.name ?? "不明"}・
                {page.updatedAt.toLocaleDateString("ja-JP")}に更新
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}