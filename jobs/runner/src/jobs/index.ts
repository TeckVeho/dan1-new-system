import { registerJob } from "../registry.js";
import { logger } from "../logger.js";

// キュー構成は docs/11_infrastructure.md §2.4 に準拠。
// queue モードでは API の pending ジョブを Cloud Run Jobs が JOB_TYPE + JOB_PAYLOAD で起動する。
// 実処理は apps/api の job-handlers に実装済み。runner からは API internal endpoint 経由で実行する想定。

registerJob("import.rakuraku_menu", async (context) => {
  logger.info("import.rakuraku_menu は import_procurement_file に統合されました", { payload: context.payload });
});

registerJob("calculation.procurement_quantity", async (context) => {
  logger.info("TODO: 発注量計算処理を実装する", { payload: context.payload });
});

registerJob("report.generate", async (context) => {
  logger.info("report.generate は export.spreadsheet に統合されました", { payload: context.payload });
});

registerJob("export.spreadsheet", async (context) => {
  logger.info("export.spreadsheet は API job-handlers で実行されます", { payload: context.payload });
});

registerJob("integration.sagawa_shipping", async (context) => {
  logger.info("TODO: 佐川伝票API連携処理を実装する", { payload: context.payload });
});
