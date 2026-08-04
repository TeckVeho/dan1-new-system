import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/** モノレポルートの .env を読み込む（npm run dev -w @dan1/api でも DATABASE_URL が使えるようにする） */
const candidates = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
  resolve(import.meta.dirname, "../../.env"),
];

for (const path of candidates) {
  if (existsSync(path)) {
    config({ path });
    break;
  }
}
