import { Router } from "express";
import {
  scheduleQuerySchema,
  scheduleExportSchema,
  orderScheduleUpdateSchema,
  importBatchSchema,
  mealCountSyncSchema,
} from "@dan1/shared";
import { authenticate, authorize } from "../../middleware/auth.js";
import { sendData, sendList, sendAccepted, buildPageMeta } from "../../lib/response.js";
import { paramId } from "../../lib/http.js";
import {
  getSchedules,
  updateSchedule,
  runImportBatch,
  listImportBatches,
  runMealCountSync,
  listMealCountSyncHistory,
  exportScheduleSpreadsheet,
} from "../../services/procurement.service.js";
import { stockRecordsRouter } from "./stock-records.routes.js";
import { importCalendarRouter } from "./import-calendar.routes.js";
import { adjustmentsRouter } from "./adjustments.routes.js";
import { getScheduleCalcBasis } from "../../services/calc-basis.service.js";

export const procurementRouter = Router();

procurementRouter.use(authenticate);
procurementRouter.use("/stock-records", stockRecordsRouter);
procurementRouter.use("/imports/calendar", importCalendarRouter);
procurementRouter.use("/adjustments", adjustmentsRouter);

procurementRouter.get("/schedules", authorize("procurement.schedule.read"), async (req, res, next) => {
  try {
    const query = scheduleQuerySchema.parse(req.query);
    const result = await getSchedules({
      supplierId: BigInt(query.supplierId),
      deliveryFrom: new Date(query.deliveryFrom),
      deliveryTo: new Date(query.deliveryTo),
      category: query.category,
      search: query.search,
      shortageOnly: query.shortageOnly,
      page: query.page,
      pageSize: query.pageSize,
    });
    sendList(res, result.items, buildPageMeta(query.page, query.pageSize, result.totalCount), {
      supplier: result.supplier,
      dates: result.dates,
      calculatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

procurementRouter.post("/schedules/export", authorize("procurement.schedule.read"), async (req, res, next) => {
  try {
    const input = scheduleExportSchema.parse(req.body);
    const job = await exportScheduleSpreadsheet({
      ctx: req.context!,
      supplierId: BigInt(input.supplierId),
      deliveryFrom: new Date(input.deliveryFrom),
      deliveryTo: new Date(input.deliveryTo),
      category: input.category,
      search: input.search,
      shortageOnly: input.shortageOnly,
      format: input.format,
    });
    sendAccepted(res, { jobId: job.id, status: job.status, statusUrl: `/api/v1/jobs/${job.id}` });
  } catch (error) {
    next(error);
  }
});

procurementRouter.patch("/schedules/:id", authorize("procurement.schedule.update"), async (req, res, next) => {
  try {
    const input = orderScheduleUpdateSchema.parse({ ...req.body, id: paramId(req.params.id) });
    const updated = await updateSchedule({
      ctx: req.context!,
      id: BigInt(input.id),
      ...(input.orderQty !== undefined ? { orderQuantity: input.orderQty } : {}),
      ...(input.actualStock !== undefined ? { stockQuantity: input.actualStock } : {}),
      version: input.version,
    });
    sendData(res, updated);
  } catch (error) {
    next(error);
  }
});

procurementRouter.post("/imports", authorize("procurement.import.execute"), async (req, res, next) => {
  try {
    const input = importBatchSchema.parse(req.body);
    const { job, importBatchId } = await runImportBatch({
      ctx: req.context!,
      supplierId: BigInt(input.supplierId),
      fileType: input.fileType,
      fileId: BigInt(input.fileId),
      targetDateFrom: input.targetDateFrom,
      targetDateTo: input.targetDateTo,
    });
    sendAccepted(res, {
      importId: importBatchId,
      jobId: job.id,
      status: job.status,
      statusUrl: `/api/v1/jobs/${job.id}`,
    });
  } catch (error) {
    next(error);
  }
});

procurementRouter.get("/imports", authorize("procurement.import.execute"), async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const perPage = Number(req.query.perPage ?? 20);
    const supplierId = req.query.supplierId ? BigInt(String(req.query.supplierId)) : undefined;
    const { items, totalCount } = await listImportBatches({ supplierId, page, perPage });
    sendList(res, items, buildPageMeta(page, perPage, totalCount));
  } catch (error) {
    next(error);
  }
});

procurementRouter.get("/meal-count-sync/history", authorize("procurement.recalculate"), async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const perPage = Number(req.query.perPage ?? 20);
    const { items, totalCount } = await listMealCountSyncHistory({ page, perPage });
    sendList(res, items, buildPageMeta(page, perPage, totalCount));
  } catch (error) {
    next(error);
  }
});

procurementRouter.post("/meal-count-sync", authorize("procurement.recalculate"), async (req, res, next) => {
  try {
    const input = mealCountSyncSchema.parse(req.body);
    const job = await runMealCountSync({
      ctx: req.context!,
      dateFrom: new Date(input.dateFrom),
      dateTo: new Date(input.dateTo),
    });
    sendAccepted(res, { jobId: job.id, status: job.status, statusUrl: `/api/v1/jobs/${job.id}` });
  } catch (error) {
    next(error);
  }
});

procurementRouter.get("/schedules/:id/calc-basis", authorize("procurement.schedule.read"), async (req, res, next) => {
  try {
    const data = await getScheduleCalcBasis(BigInt(paramId(req.params.id)));
    sendData(res, data);
  } catch (error) {
    next(error);
  }
});
