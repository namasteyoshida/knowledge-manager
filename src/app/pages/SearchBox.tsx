"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SearchBox({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/pages/search?q=${encodeURIComponent(query)}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="キーワードで検索"
        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        検索
      </button>
    </form>
  );
}