"use client";

export function MarkdownToolbar({ onInsert }: { onInsert: (before: string, after?: string) => void }) {
  return (
    <div className="flex gap-1 rounded-t-md border border-b-0 border-gray-300 bg-gray-50 p-1">
      <button type="button" onClick={() => onInsert("## ")} className="rounded px-2 py-1 text-sm hover:bg-gray-200" title="見出し">H</button>
      <button type="button" onClick={() => onInsert("**", "**")} className="rounded px-2 py-1 text-sm font-bold hover:bg-gray-200" title="太字">B</button>
      <button type="button" onClick={() => onInsert("- ")} className="rounded px-2 py-1 text-sm hover:bg-gray-200" title="箇条書き">•</button>
      <button type="button" onClick={() => onInsert("[", "](url)")} className="rounded px-2 py-1 text-sm hover:bg-gray-200" title="リンク">🔗</button>
    </div>
  );
}