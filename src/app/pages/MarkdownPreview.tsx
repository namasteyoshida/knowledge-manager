"use client";

import { useState, useEffect } from "react";
import { markdownToHtml } from "@/lib/markdown";

export function MarkdownPreview({ content }: { content: string }) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      markdownToHtml(content).then(setHtml);
    }, 300);
    return () => clearTimeout(timer);
  }, [content]);

  return (
    <div className="prose prose-sm max-w-none rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="text-sm text-gray-400">プレビューがここに表示されます</p>
      )}
    </div>
  );
}