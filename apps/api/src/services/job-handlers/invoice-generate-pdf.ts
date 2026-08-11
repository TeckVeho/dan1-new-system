import type { Job } from "@dan1/database";
import type { JobHandler } from "./index.js";
import { ValidationError } from "../../lib/errors.js";
import { generateAndAttachInvoicePdf } from "../invoice-pdf.service.js";

export const handleInvoiceGeneratePdf: JobHandler = async (job, { setProgress }) => {
  const params = (job.params ?? {}) as Record<string, unknown>;
  const invoiceIdRaw = params.invoiceId;
  if (typeof invoiceIdRaw !== "string" || !/^\d+$/.test(invoiceIdRaw)) {
    throw new ValidationError("invoiceId が不正です");
  }

  await setProgress(10, "請求書 PDF を生成中");
  const result = await generateAndAttachInvoicePdf({
    invoiceId: BigInt(invoiceIdRaw),
    createdBy: job.createdBy ?? undefined,
  });
  await setProgress(100, "請求書 PDF を保存しました");
  return result;
};
