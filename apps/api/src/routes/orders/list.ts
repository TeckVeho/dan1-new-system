import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveScopedCustomerId } from "../../lib/scope.js";
import { sendData, sendList, buildPageMeta } from "../../lib/response.js";
import { listOrders, patchMealOrder } from "../../services/orders.service.js";
import { paramId } from "../../lib/http.js";

export const orderListRouter = Router();

orderListRouter.use(authenticate);

const listQuerySchema = z.object({
  customerId: z.string().optional(),
  serviceDateFrom: z.string().optional(),
  serviceDateTo: z.string().optional(),
  unitId: z.string().optional(),
  mealTypeId: z.string().optional(),
  menuKindId: z.string().optional(),
  status: z.enum(["draft", "provisional", "confirmed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).default(50),
});

orderListRouter.get("/", authorize("order.read"), async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const customerId = resolveScopedCustomerId(req.context!, query.customerId);
    const { items, totalCount } = await listOrders({
      customerId,
      serviceDateFrom: query.serviceDateFrom ? new Date(query.serviceDateFrom) : undefined,
      serviceDateTo: query.serviceDateTo ? new Date(query.serviceDateTo) : undefined,
      unitId: query.unitId ? BigInt(query.unitId) : undefined,
      mealTypeId: query.mealTypeId ? BigInt(query.mealTypeId) : undefined,
      menuKindId: query.menuKindId ? BigInt(query.menuKindId) : undefined,
      status: query.status,
      page: query.page,
      perPage: query.perPage,
    });
    sendList(res, items, buildPageMeta(query.page, query.perPage, totalCount));
  } catch (error) {
    next(error);
  }
});

const patchOrderSchema = z.object({
  quantity: z.number().int().min(0),
  version: z.number().int().min(0),
  reason: z.string().max(500).optional(),
});

orderListRouter.patch("/:id", authorize("order.update"), async (req, res, next) => {
  try {
    const input = patchOrderSchema.parse(req.body);
    const orderId = BigInt(paramId(req.params.id));
    const item = await patchMealOrder({
      ctx: req.context!,
      orderId,
      quantity: input.quantity,
      version: input.version,
      reason: input.reason,
    });
    sendData(res, item);
  } catch (error) {
    next(error);
  }
});
