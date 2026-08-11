import { prisma } from "@dan1/database";
import type { JobHandler } from "./index.js";
import { readFileContent } from "../files.service.js";

export const handleImportProcurementFile: JobHandler = async (job, { setProgress }) => {
  const params = (job.params ?? {}) as Record<string, unknown>;
  const importBatchId = BigInt(String(params.importBatchId));
  const fileId = params.fileId ? BigInt(String(params.fileId)) : null;

  const batch = await prisma.importBatch.findUnique({ where: { id: importBatchId } });
  if (!batch) {
    throw new Error("取込バッチが見つかりません");
  }

  await prisma.importBatch.update({
    where: { id: importBatchId },
    data: { status: "running", startedAt: new Date() },
  });

  await setProgress(20, "ファイルを検証中");

  let fileSize = 0;
  let originalName = "";
  if (fileId) {
    const file = await readFileContent(fileId);
    fileSize = file.body.length;
    originalName = file.originalName;
    await setProgress(50, `ファイル「${originalName}」を受信しました（${fileSize} bytes）`);
  } else {
    await setProgress(50, "ファイルIDが未指定のため検証のみ実行します");
  }

  // らくらく献立のパース本体は実ファイル仕様確定後に実装（Q-22）
  const completed = await prisma.importBatch.update({
    where: { id: importBatchId },
    data: {
      status: "completed",
      completedAt: new Date(),
      successCount: fileId ? 1 : 0,
      errorCount: 0,
      params: {
        ...(typeof batch.params === "object" && batch.params ? (batch.params as Record<string, unknown>) : {}),
        fileId: fileId?.toString() ?? null,
        originalName: originalName || null,
        fileSize,
        note: "パーサ未実装: ファイル受信・検証のみ完了",
      },
    },
  });

  await setProgress(100, "取込処理が完了しました");

  return {
    importBatchId: completed.id.toString(),
    fileId: fileId?.toString() ?? null,
    successCount: completed.successCount,
    errorCount: completed.errorCount,
  };
};
