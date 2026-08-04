import { registerJob } from "../registry.js";
import { logger } from "../logger.js";

// キュー構成は docs/11_infrastructure.md §2.4 に準拠。
// 各ハンドラは実装のプレースホルダー。実処理は @dan1/database 等を使って追加する。

// キュー: imports（らくらく献立取込・食数同期）
registerJob("import.rakuraku_menu", async (context) => {
  logger.info("TODO: らくらく献立の取込処理を実装する", { payload: context.payload });
});

// キュー: calculations（発注量計算）
registerJob("calculation.procurement_quantity", async (context) => {
  logger.info("TODO: 発注量計算処理を実装する", { payload: context.payload });
});

// キュー: reports（帳票・資料生成）
registerJob("report.generate", async (context) => {
  logger.info("TODO: 帳票・資料生成処理を実装する", { payload: context.payload });
});

// キュー: exports（Excel / CSV 出力）
registerJob("export.spreadsheet", async (context) => {
  logger.info("TODO: Excel / CSV 出力処理を実装する", { payload: context.payload });
});

// キュー: integrations（佐川API送信・メール送信）
registerJob("integration.sagawa_shipping", async (context) => {
  logger.info("TODO: 佐川伝票API連携処理を実装する", { payload: context.payload });
});
