import { Router } from "express";
import { mealCountAdjustmentBulkSchema, mealCountAdjustmentQuerySchema } from "@dan1/shared";
import { authenticate, authorize } from "../../middleware/auth.js";
import { sendData, sendList, buildPageMeta } from "../../lib/response.js";
import { resolveOptionalScopedCustomerId } from "../../lib/scope.js";
import {
  bulkUpsertMealCountAdjustments,
  listMealCountAdjustments,
} from "../../services/meal-count-adjustment.service.js";

export const adjustmentsRouter = Router();

adjustmentsRouter.use(authenticate);

adjustmentsRouter.get("/", authorize("procurement.adjustment.update"), async (req, res, next) => {
  try {
    const query = mealCountAdjustmentQuerySchema.parse(req.query);
    const customerId = resolveOptionalScopedCustomerId(req.context!, query.customerId);
    const { items, totalCount } = await listMealCountAdjustments({
      ctx: req.context!,
      customerId,
      serviceDateFrom: query.serviceDateFrom ? new Date(query.serviceDateFrom) : undefined,
      serviceDateTo: query.serviceDateTo ? new Date(query.serviceDateTo) : undefined,
      page: query.page,
      perPage: query.perPage,
    });
    sendList(res, items, buildPageMeta(query.page, query.perPage, totalCount));
  } catch (error) {
    next(error);
  }
});

adjustmentsRouter.put("/", authorize("procurement.adjustment.update"), async (req, res, next) => {
  try {
    const input = mealCountAdjustmentBulkSchema.parse(req.body);
    const saved = await bulkUpsertMealCountAdjustments({
      ctx: req.context!,
      items: input.items.map((item) => ({
        customerId: BigInt(item.customerId),
        serviceDate: new Date(item.serviceDate),
        mealTypeId: BigInt(item.mealTypeId),
        adjustMeals: item.adjustMeals,
        reason: item.reason,
        version: item.version,
      })),
    });
    sendData(res, { saved: saved.length, items: saved });
  } catch (error) {
    next(error);
  }
});
