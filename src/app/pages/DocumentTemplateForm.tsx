"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createPageFromTemplate } from "./actions";
import { composeTemplateMarkdown } from "@/lib/templateContent";
import { markdownToHtml } from "@/lib/markdown";

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
  const [previewHtml, setPreviewHtml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const markdown = composeTemplateMarkdown({
      conclusion, backgroundIssue, causePoint, actionSteps, notesSummary,
    });
    const timer = setTimeout(() => {
      markdownToHtml(markdown).then(setPreviewHtml);
    }, 300);
    return () => clearTimeout(timer);
  }, [conclusion, backgroundIssue, causePoint, actionSteps, notesSummary]);

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
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">1. 結論</label>
            <textarea
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              rows={2}
              placeholder={"○○について、最も重要な点は△△です。"}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">2. 背景・課題</label>
            <textarea
              value={backgroundIssue}
              onChange={(e) => setBackgroundIssue(e.target.value)}
              rows={5}
              placeholder={"なぜこのナレッジが必要になったのか、\nどのような状況・課題があったのかを説明します。"}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">3. 原因・ポイント</label>
            <textarea
              value={causePoint}
              onChange={(e) => setCausePoint(e.target.value)}
              rows={3}
              placeholder={"問題が発生した理由や、\n知っておくべき重要なポイントを説明します。"}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">4. 対応方法・手順</label>
            <textarea
              value={actionSteps}
              onChange={(e) => setActionSteps(e.target.value)}
              rows={5}
              placeholder={"以下の手順で対応します。\n① ○○する\n② △△する\n③ □□する"}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">5. 注意点・まとめ</label>
            <textarea
              value={notesSummary}
              onChange={(e) => setNotesSummary(e.target.value)}
              rows={3}
              placeholder={"・○○に注意する\n・△△の場合は□□する\n・最も重要なのは○○"}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

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
        {loading ? "作成中..." : "記事として保存"}
      </button>
    </form>
  );
}