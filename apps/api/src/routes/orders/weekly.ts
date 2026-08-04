import { Router } from "express";
import { z } from "zod";
import { bulkMealOrderSchema } from "@dan1/shared";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveScopedCustomerId } from "../../lib/scope.js";
import { sendData } from "../../lib/response.js";
import { getWeeklyOrders, saveWeeklyOrders } from "../../services/orders.service.js";

export const weeklyOrdersRouter = Router();

weeklyOrdersRouter.use(authenticate);

const weeklyQuerySchema = z.object({
  customerId: z.string().optional(),
  unitId: z.string().optional(),
  weekStart: z.string(),
});

weeklyOrdersRouter.get("/weekly", authorize("order.read"), async (req, res, next) => {
  try {
    const query = weeklyQuerySchema.parse(req.query);
    const customerId = resolveScopedCustomerId(req.context!, query.customerId);
    const result = await getWeeklyOrders({
      customerId,
      unitId: query.unitId ? BigInt(query.unitId) : undefined,
      weekStart: query.weekStart,
    });
    sendData(res, result);
  } catch (error) {
    next(error);
  }
});

const putWeeklySchema = z.object({
  customerId: z.string().optional(),
  commit: z.boolean(),
  orders: bulkMealOrderSchema.shape.orders,
});

weeklyOrdersRouter.put("/weekly", authorize("order.create", "order.update"), async (req, res, next) => {
  try {
    const input = putWeeklySchema.parse(req.body);
    const customerId = resolveScopedCustomerId(req.context!, input.customerId);
    const result = await saveWeeklyOrders({ ctx: req.context!, customerId, commit: input.commit, orders: input.orders });
    sendData(res, result);
  } catch (error) {
    next(error);
  }
});
