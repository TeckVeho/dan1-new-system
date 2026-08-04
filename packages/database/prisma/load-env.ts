import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/** モノレポルートの .env を読み込む（Python の dotenv CLI との衝突を避ける） */
const candidates = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
  resolve(import.meta.dirname, "../../../.env"),
];

for (const path of candidates) {
  if (existsSync(path)) {
    config({ path });
    break;
  }
}
