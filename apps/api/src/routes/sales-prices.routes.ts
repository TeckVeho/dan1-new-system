import { Router } from "express";
import { salesPriceGenerateSchema } from "@dan1/shared";
import { authenticate, authorize } from "../middleware/auth.js";
import { sendAccepted, sendData } from "../lib/response.js";
import { buildSalesPriceRows, enqueueSalesPriceJob } from "../services/selling-price.service.js";

export const salesPricesRouter = Router();

salesPricesRouter.use(authenticate);

salesPricesRouter.post("/generate", authorize("sales_price.generate"), async (req, res, next) => {
  try {
    const input = salesPriceGenerateSchema.parse(req.body);
    const job = await enqueueSalesPriceJob({
      ctx: req.context!,
      invoiceMonth: input.invoiceMonth,
      customerIds: input.customerIds?.map((id) => BigInt(id)),
      format: input.format,
    });
    sendAccepted(res, { jobId: job.id, status: job.status, statusUrl: `/api/v1/jobs/${job.id}` });
  } catch (error) {
    next(error);
  }
});

salesPricesRouter.get("/preview", authorize("sales_price.read"), async (req, res, next) => {
  try {
    const invoiceMonth = String(req.query.invoiceMonth ?? "");
    if (!/^\d{4}-\d{2}$/.test(invoiceMonth)) {
      throw new Error("invoiceMonth は YYYY-MM 形式で指定してください");
    }
    const customerIds = req.query.customerIds
      ? String(req.query.customerIds).split(",").filter(Boolean).map((id) => BigInt(id))
      : undefined;
    const rows = await buildSalesPriceRows(invoiceMonth, customerIds);
    sendData(res, { invoiceMonth, rowCount: rows.length, preview: rows.slice(0, 20) });
  } catch (error) {
    next(error);
  }
});
