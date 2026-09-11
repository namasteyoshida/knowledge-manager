import type { DocumentGenerator } from "./types";

export class GammaGenerator implements DocumentGenerator {
  async generate(inputText: string): Promise<{ resultUrl: string }> {
    const apiKey = process.env.GAMMA_API_KEY;
    if (!apiKey) {
      throw new Error("GAMMA_API_KEYが設定されていません");
    }

    // 1. 生成を開始する
    const createRes = await fetch("https://public-api.gamma.app/v1.0/generations", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputText,
        format: "document",
        textMode: "preserve",
      }),
    });

    if (!createRes.ok) {
      throw new Error(`Gamma API生成開始に失敗しました: ${createRes.status}`);
    }

    const { generationId } = await createRes.json();

    // 2. 完了するまでポーリング(5秒間隔)
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const statusRes = await fetch(
        `https://public-api.gamma.app/v1.0/generations/${generationId}`,
        { headers: { "X-API-KEY": apiKey } }
      );
      const statusData = await statusRes.json();

      if (statusData.status === "completed") {
        return { resultUrl: statusData.gammaUrl };
      }
      if (statusData.status === "failed") {
        throw new Error("Gamma側での生成に失敗しました");
      }
      // "processing"等の場合はループを継続
    }
  }
}