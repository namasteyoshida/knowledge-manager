import { MockGenerator } from "./mock";
// import { GammaGenerator } from "./gamma"; // 将来、有料プラン契約時にコメントアウトを外す

export const documentGenerator = new MockGenerator();
// export const documentGenerator = new GammaGenerator(); // 切り替え時はこちらに変更