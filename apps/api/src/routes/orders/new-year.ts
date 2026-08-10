import { Router } from "express";
import { z } from "zod";
import { prisma } from "@dan1/database";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveScopedCustomerId } from "../../lib/scope.js";
import { sendData } from "../../lib/response.js";
import { getWeeklyOrders, saveWeeklyOrders } from "../../services/orders.service.js";
import { getOrderWindows } from "../../services/order-windows.service.js";

export const newYearOrdersRouter = Router();

newYearOrdersRouter.use(authenticate);

const querySchema = z.object({
  customerId: z.string().optional(),
  year: z.coerce.number().int().min(2000).max(2100),
});

function newYearWeekStart(year: number): string {
  return `${year}-01-01`;
}

newYearOrdersRouter.get("/new-year", authorize("order.read"), async (req, res, next) => {
  try {
    const query = querySchema.parse(req.query);
    const customerId = resolveScopedCustomerId(req.context!, query.customerId);
    const weekStart = newYearWeekStart(query.year);
    const weekEnd = `${query.year}-01-07`;

    const [grid, windowRes] = await Promise.all([
      getWeeklyOrders({ customerId, weekStart, orderTypeCode: "new_year" }),
      getOrderWindows({
        customerId,
        orderType: "new_year",
        from: weekStart,
        to: weekEnd,
      }),
    ]);

    sendData(res, {
      year: query.year,
      weekStart,
      accepting: windowRes.windows.some(
        (w) => w.deadlineAt && new Date(w.deadlineAt).getTime() > Date.now(),
      ),
      nextDeadline: windowRes.nextDeadline,
      changeWindow: windowRes.changeWindow,
      grid,
    });
  } catch (error) {
    next(error);
  }
});

const putSchema = z.object({
  customerId: z.string().optional(),
  year: z.coerce.number().int().min(2000).max(2100),
  commit: z.boolean(),
  cells: z.array(
    z.object({
      unitId: z.string(),
      serviceDate: z.string(),
      mealTypeId: z.string(),
      menuKindId: z.string(),
      quantity: z.number().int().min(0),
      version: z.number().int().min(0).nullable().optional(),
    }),
  ),
});

newYearOrdersRouter.put("/new-year", authorize("order.create", "order.update"), async (req, res, next) => {
  try {
    const input = putSchema.parse(req.body);
    const customerId = resolveScopedCustomerId(req.context!, input.customerId);
    const newYearOrderType = await prisma.orderType.findUnique({ where: { code: "new_year" } });
    if (!newYearOrderType) throw new Error("order type new_year is not configured");

    const orders = input.cells.map((cell) => ({
      ...cell,
      orderTypeId: newYearOrderType.id.toString(),
    }));

    const result = await saveWeeklyOrders({
      ctx: req.context!,
      customerId,
      commit: input.commit,
      orders,
      orderTypeCode: "new_year",
    });
    sendData(res, result);
  } catch (error) {
    next(error);
  }
});
