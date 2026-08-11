import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveOptionalScopedCustomerId } from "../../lib/scope.js";
import { sendList, buildPageMeta } from "../../lib/response.js";
import { listRiceOrderLogs } from "../../services/rice-allergen.service.js";

export const riceLogsRouter = Router();

riceLogsRouter.use(authenticate);

const querySchema = z.object({
  customerId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).default(50),
});

riceLogsRouter.get("/rice/logs", authorize("order.read"), async (req, res, next) => {
  try {
    const query = querySchema.parse(req.query);
    const customerId = resolveOptionalScopedCustomerId(req.context!, query.customerId);
    const { items, totalCount } = await listRiceOrderLogs({
      customerId,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      page: query.page,
      perPage: query.perPage,
    });
    sendList(res, items, buildPageMeta(query.page, query.perPage, totalCount));
  } catch (error) {
    next(error);
  }
});
