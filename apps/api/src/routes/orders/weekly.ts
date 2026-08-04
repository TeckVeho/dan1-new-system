import { Router } from "express";
import { z } from "zod";
import { prisma } from "@dan1/database";
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

const weeklyCellSchema = z.object({
  unitId: z.string(),
  serviceDate: z.string(),
  mealTypeId: z.string(),
  menuKindId: z.string(),
  quantity: z.number().int().min(0),
  version: z.number().int().min(0).nullable().optional(),
});

const putWeeklySchema = z
  .object({
    customerId: z.string().optional(),
    weekStart: z.string().optional(),
    commit: z.boolean(),
    orders: bulkMealOrderSchema.shape.orders.optional(),
    cells: z.array(weeklyCellSchema).optional(),
  })
  .refine((value) => (value.orders?.length ?? 0) > 0 || (value.cells?.length ?? 0) > 0, {
    message: "orders または cells が必要です",
    path: ["orders"],
  });

weeklyOrdersRouter.put("/weekly", authorize("order.create", "order.update"), async (req, res, next) => {
  try {
    const input = putWeeklySchema.parse(req.body);
    const customerId = resolveScopedCustomerId(req.context!, input.customerId);

    let orders = input.orders ?? [];
    if (orders.length === 0 && input.cells) {
      const normalOrderType = await prisma.orderType.findUnique({ where: { code: "normal" } });
      if (!normalOrderType) {
        throw new Error("order type normal is not configured");
      }
      const orderTypeId = normalOrderType.id.toString();
      orders = input.cells.map((cell) => ({
        ...cell,
        orderTypeId,
      }));
    }

    const result = await saveWeeklyOrders({ ctx: req.context!, customerId, commit: input.commit, orders });
    sendData(res, result);
  } catch (error) {
    next(error);
  }
});
