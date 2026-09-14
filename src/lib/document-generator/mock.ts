import type { DocumentGenerator } from "./types";

export class MockGenerator implements DocumentGenerator {
  async generate(inputText: string): Promise<{ resultUrl: string }> {
    // 実際のAPI呼び出しの代わりに、数秒の遅延で「生成中」の状態を再現する
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // ダミーの結果URL(実際にはGamma側の閲覧リンクが入る想定)
    return {
      resultUrl: "https://gamma.app/docs/mock-result-" + Date.now(),
    };
  }
}