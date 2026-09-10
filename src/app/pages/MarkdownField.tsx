"use client";

import { useRef, useCallback } from "react";
import { MarkdownToolbar } from "./MarkdownToolbar";
import { applyMarkdownSyntax } from "@/lib/markdownSyntax";

type Props = {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
};

export function MarkdownField({ value, onChange, rows = 8, placeholder }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsert = useCallback(
    (before: string, after: string = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { newValue, newCursorPos } = applyMarkdownSyntax(
        value,
        textarea.selectionStart,
        textarea.selectionEnd,
        before,
        after
      );

      onChange(newValue);

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      });
    },
    [value, onChange]
  );

  return (
    <div>
      <MarkdownToolbar onInsert={handleInsert} />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="-mt-px w-full rounded-b-md border border-gray-300 px-3 py-2 font-mono text-sm"
      />
    </div>
  );
}