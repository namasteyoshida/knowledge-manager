"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePage } from "../actions";

export function DeleteButton({ pageId }: { pageId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    const confirmed = window.confirm(
      "この記事を削除しますか?この操作は一覧・検索から見えなくなりますが、データは内部的に保持されます。"
    );
    if (!confirmed) return;

    setLoading(true);
    const result = await deletePage(pageId);
    if (result.error) {
      alert(result.error);
      setLoading(false);
      return;
    }
    router.push("/pages");
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      {loading ? "削除中..." : "削除"}
    </button>
  );
}