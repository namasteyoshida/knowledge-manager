"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createPage } from "./actions";

type User = { id: string; name: string };

export function PageForm({ users }: { users: User[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const page = await createPage(title, content, authorId);
      router.push(`/pages/${page.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="記事のタイトル"
        className="rounded-md border border-gray-300 px-3 py-2"
      />

      <select
        value={authorId}
        onChange={(e) => setAuthorId(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2"
      >
        <option value="">著者を選択</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={10}
        placeholder="Markdownで入力…"
        className="rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {loading ? "保存中..." : "保存"}
      </button>
    </form>
  );
}