"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createPage, updatePage } from "./actions";
import { markdownToHtml } from "@/lib/markdown";

type User = { id: string; name: string };

type Props =
  | { mode: "create"; users: User[] }
  | { mode: "edit"; pageId: string; title: string; initialContent: string; users: User[] };

export function PageForm(props: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(props.mode === "edit" ? props.title : "");
  const [content, setContent] = useState(props.mode === "edit" ? props.initialContent : "");
  const [authorId, setAuthorId] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // contentが変わるたびに、少し待ってからHTML変換する
  useEffect(() => {
    const timer = setTimeout(() => {
      markdownToHtml(content).then(setPreviewHtml);
    }, 300);
    return () => clearTimeout(timer);
  }, [content]);

  function insertSyntax(before: string, after: string = "") {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.slice(start, end);
    const newContent = content.slice(0, start) + before + selectedText + after + content.slice(end);
    setContent(newContent);
    requestAnimationFrame(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  }

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

      <div className="flex gap-1 rounded-t-md border border-b-0 border-gray-300 bg-gray-50 p-1">
        <button type="button" onClick={() => insertSyntax("## ")} className="rounded px-2 py-1 text-sm hover:bg-gray-200" title="見出し">H</button>
        <button type="button" onClick={() => insertSyntax("**", "**")} className="rounded px-2 py-1 text-sm font-bold hover:bg-gray-200" title="太字">B</button>
        <button type="button" onClick={() => insertSyntax("- ")} className="rounded px-2 py-1 text-sm hover:bg-gray-200" title="箇条書き">•</button>
        <button type="button" onClick={() => insertSyntax("[", "](url)")} className="rounded px-2 py-1 text-sm hover:bg-gray-200" title="リンク">🔗</button>
      </div>

      {/* 入力欄とプレビューの2カラム */}
      <div className="grid grid-cols-2 gap-3">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          placeholder="Markdownで入力…"
          className="-mt-4 rounded-b-md border border-gray-300 px-3 py-2 font-mono text-sm"
        />
        <div className="prose prose-sm max-w-none rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          {previewHtml ? (
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          ) : (
            <p className="text-sm text-gray-400">プレビューがここに表示されます</p>
          )}
        </div>
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