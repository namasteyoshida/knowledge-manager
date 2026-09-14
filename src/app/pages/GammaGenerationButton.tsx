"use client";

import { useState, useEffect, useRef } from "react";
import { requestGammaGeneration } from "./actions";

type Status = "idle" | "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export function GammaGenerationButton({
  inputText,
  userId,
  pageId,
}: {
  inputText: string;
  userId: string;
  pageId?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function handleClick() {
    const confirmed = window.confirm(
      "この内容はGamma(外部サービス)に送信されます。機密情報が含まれていないことを確認してください。"
    );
    if (!confirmed) return;
    
    setStatus("PENDING");
    setResultUrl(null);
    setErrorMessage(null);

    const result = await requestGammaGeneration(inputText, userId, pageId);
    if (result.error) {
      setStatus("FAILED");
      setErrorMessage(result.error);
      return;
    }

    // 2秒間隔でポーリング開始
    intervalRef.current = setInterval(async () => {
      const res = await fetch(`/api/generation-requests/${result.requestId}`);
      const data = await res.json();

      setStatus(data.status);

      if (data.status === "COMPLETED" || data.status === "FAILED") {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setResultUrl(data.resultUrl);
        setErrorMessage(data.errorMessage);
      }
    }, 2000);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "PENDING" || status === "PROCESSING"}
        className="self-start rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "PENDING" || status === "PROCESSING" ? "生成中..." : "Gammaでスライド化"}
      </button>

      {status === "COMPLETED" && resultUrl && (
        <a href={resultUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">
          生成結果を見る ↗
        </a>
      )}

      {status === "FAILED" && (
        <p className="text-sm text-red-600">生成に失敗しました{errorMessage ? `:${errorMessage}` : ""}</p>
      )}
    </div>
  );
}