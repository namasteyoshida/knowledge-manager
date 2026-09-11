export interface DocumentGenerator {
  generate(inputText: string): Promise<{ resultUrl: string }>;
}

// 「入力テキストを受け取り、生成結果のURLを返す」というルールだけ決める
// モックか本物のgammaAPIを使うかは、実装する側に任せる