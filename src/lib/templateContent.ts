type TemplateSections = {
  conclusion: string;
  backgroundIssue: string;
  causePoint: string;
  actionSteps: string;
  notesSummary: string;
};

export function composeTemplateMarkdown(sections: TemplateSections): string {
  return [
    "## 1. 結論",
    sections.conclusion,
    "",
    "## 2. 背景・課題",
    sections.backgroundIssue,
    "",
    "## 3. 原因・ポイント",
    sections.causePoint,
    "",
    "## 4. 対応方法・手順",
    sections.actionSteps,
    "",
    "## 5. 注意点・まとめ",
    sections.notesSummary,
  ].join("\n");
}