// 選択した文字列にMarkdown記法を追加する関数
export function applyMarkdownSyntax(
  // textareaに入力されている全体の文字列
  value: string,

  // 選択範囲の開始位置
  selectionStart: number,

  // 選択範囲の終了位置
  selectionEnd: number,

  // 選択した文字列の前に追加するMarkdown
  // 例: "**", "## ", "- "
  before: string,

  // 選択した文字列の後ろに追加するMarkdown
  // 例: "**", "](url)"
  // 指定しなければ空文字
  after: string = ""
): { newValue: string; newCursorPos: number } {

  // 選択されている文字列だけを取り出す
  // 例: 「こんにちは世界」の「世界」を選択していたら「世界」
  const selectedText = value.slice(selectionStart, selectionEnd);

  // 元の文字列にMarkdown記法を追加して、新しい文字列を作る
  //
  // 選択範囲より前の文字
  // ＋ before
  // ＋ 選択された文字
  // ＋ after
  // ＋ 選択範囲より後ろの文字
  const newValue =
    value.slice(0, selectionStart) +
    before +
    selectedText +
    after +
    value.slice(selectionEnd);

  // Markdownを追加した後のカーソル位置を計算する
  //
  // 選択範囲の開始位置
  // ＋ beforeの文字数
  // ＋ 選択文字列の文字数
  // ＋ afterの文字数
  const newCursorPos =
    selectionStart +
    before.length +
    selectedText.length +
    after.length;

  // 作成した新しい文字列と、
  // 新しいカーソル位置を呼び出し元に返す
  return { newValue, newCursorPos };
}