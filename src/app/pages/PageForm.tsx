"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createPage, updatePage } from "./actions";
import { MarkdownField } from "./MarkdownField";
import { MarkdownPreview } from "./MarkdownPreview";

type User = { id: string; name: string };

type Props =
  | { mode: "create"; users: User[] }
  | { mode: "edit"; pageId: string; title: string; initialContent: string; users: User[] };

export function PageForm(props: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(props.mode === "edit" ? props.title : "");
  const [content, setContent] = useState(props.mode === "edit" ? props.initialContent : "");
  const [authorId, setAuthorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (props.mode === "create") {
        const page = await createPage(title, content, authorId);
        router.push(`/pages/${page.id}`);
      } else {
        await updatePage(props.pageId, content, authorId);
        router.push(`/pages/${props.pageId}`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {props.mode === "create" ? (
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="記事のタイトル"
          className="rounded-md border border-gray-300 px-3 py-2"
        />
      ) : (
        <p className="text-lg font-semibold text-gray-900">{props.title}</p>
      )}

      <select
        value={authorId}
        onChange={(e) => setAuthorId(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2"
      >
        <option value="">著者を選択</option>
        {props.users.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-3">
        <MarkdownField value={content} onChange={setContent} rows={12} placeholder="Markdownで入力…" />
        <MarkdownPreview content={content} />
      </div>

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