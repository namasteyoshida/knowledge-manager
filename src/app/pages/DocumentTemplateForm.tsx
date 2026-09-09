"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createPageFromTemplate } from "./actions";
import { composeTemplateMarkdown } from "@/lib/templateContent";
import { MarkdownField } from "./MarkdownField";
import { MarkdownPreview } from "./MarkdownPreview";

type User = { id: string; name: string };

export function DocumentTemplateForm({ users }: { users: User[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [backgroundIssue, setBackgroundIssue] = useState("");
  const [causePoint, setCausePoint] = useState("");
  const [actionSteps, setActionSteps] = useState("");
  const [notesSummary, setNotesSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const composedMarkdown = composeTemplateMarkdown({
    conclusion, backgroundIssue, causePoint, actionSteps, notesSummary,
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const page = await createPageFromTemplate(
        title,
        { conclusion, backgroundIssue, causePoint, actionSteps, notesSummary },
        authorId
      );
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
        placeholder="○○について"
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

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">1. 結論</label>
            <MarkdownField value={conclusion} onChange={setConclusion} rows={2}
              placeholder="○○について、最も重要なポイントは△△です。" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">2. 背景・課題</label>
            <MarkdownField value={backgroundIssue} onChange={setBackgroundIssue} rows={3}
              placeholder={"なぜこのナレッジが必要になったのか、\nどのような状況・課題があったのかを説明します。"} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">3. 原因・ポイント</label>
            <MarkdownField value={causePoint} onChange={setCausePoint} rows={3}
              placeholder={"問題が発生した理由や、\n知っておくべき重要なポイントを説明します。"} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">4. 対応方法・手順</label>
            <MarkdownField value={actionSteps} onChange={setActionSteps} rows={4}
              placeholder={"以下の手順で対応します。\n① ○○する\n② △△する\n③ □□する"} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">5. 注意点・まとめ</label>
            <MarkdownField value={notesSummary} onChange={setNotesSummary} rows={3}
              placeholder={"・○○に注意する\n・△△の場合は□□する\n・最も重要なのは○○"} />
          </div>
        </div>

        <MarkdownPreview content={composedMarkdown} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {loading ? "作成中..." : "記事として保存"}
      </button>
    </form>
  );
}