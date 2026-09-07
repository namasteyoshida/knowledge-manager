// app/test/TestCreateButton.tsx
"use client";

import { useState } from "react";
import { createPage } from "@/app/pages/actions";

export function TestCreateButton({ authorId }: { authorId: string }) {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    setResult(null);
    try {
      const page = await createPage(
        "テスト記事タイトル",
        "## テスト本文\nこれはcreatePageの動作確認用の記事です。",
        authorId
      );
      setResult(`作成成功: Page ID = ${page.id}`);
    } catch (e) {
      setResult(`エラー: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleClick} disabled={loading}>
        {loading ? "作成中..." : "テスト記事を作成"}
      </button>
      {result && <p>{result}</p>}
    </div>
  );
}