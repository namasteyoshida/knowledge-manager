"use client";

import { useState } from "react";
import { PageForm } from "./PageForm";
import { DocumentTemplateForm } from "./DocumentTemplateForm";

type User = { id: string; name: string };

export function NewPageSwitcher({ users }: { users: User[] }) {
  const [mode, setMode] = useState<"free" | "template">("free");

  return (
    <div>
      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("free")}
          className={`rounded-md px-3 py-1.5 text-sm ${
            mode === "free" ? "bg-gray-900 text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          自由入力
        </button>
        <button
          type="button"
          onClick={() => setMode("template")}
          className={`rounded-md px-3 py-1.5 text-sm ${
            mode === "template" ? "bg-gray-900 text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          テンプレート入力
        </button>
      </div>

      {mode === "free" ? (
        <PageForm mode="create" users={users} />
      ) : (
        <DocumentTemplateForm users={users} />
      )}
    </div>
  );
}