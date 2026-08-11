import { Router } from "express";
import { stockRecordCreateSchema, stockRecordQuerySchema } from "@dan1/shared";
import { authenticate, authorize } from "../../middleware/auth.js";
import { sendData, sendList, buildPageMeta } from "../../lib/response.js";
import { createStockRecord, listStockRecords } from "../../services/stock-record.service.js";

export const stockRecordsRouter = Router();

stockRecordsRouter.use(authenticate);

stockRecordsRouter.get("/", authorize("procurement.stock_record.update"), async (req, res, next) => {
  try {
    const query = stockRecordQuerySchema.parse(req.query);
    const { items, totalCount } = await listStockRecords({
      stockItemId: query.stockItemId ? BigInt(query.stockItemId) : undefined,
      recordDateFrom: query.recordDateFrom ? new Date(query.recordDateFrom) : undefined,
      recordDateTo: query.recordDateTo ? new Date(query.recordDateTo) : undefined,
      page: query.page,
      perPage: query.perPage,
    });
    sendList(res, items, buildPageMeta(query.page, query.perPage, totalCount));
  } catch (error) {
    next(error);
  }
});

stockRecordsRouter.post("/", authorize("procurement.stock_record.update"), async (req, res, next) => {
  try {
    const input = stockRecordCreateSchema.parse(req.body);
    const created = await createStockRecord({
      ctx: req.context!,
      stockItemId: BigInt(input.stockItemId),
      recordDate: new Date(input.recordDate),
      quantity: input.quantity,
      recordType: input.recordType,
    });
    sendData(res, created, 201);
  } catch (error) {
    next(error);
  }
});
