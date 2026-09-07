import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

export async function markdownToHtml(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)      // Markdown文字列 → AST
    .use(remarkRehype)     // Markdown用AST → HTML用AST
    .use(rehypeSanitize)   // 危険なタグ・属性を除去(XSS対策)
    .use(rehypeStringify)  // HTML用AST → HTML文字列
    .process(markdown);

  return String(file);
}