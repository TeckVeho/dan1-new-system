import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../middleware/auth.js";
import { resolveScopedCustomerId } from "../lib/scope.js";
import { sendData } from "../lib/response.js";
import { getOrderWindows } from "../services/order-windows.service.js";

export const orderWindowsRouter = Router();

const querySchema = z.object({
  unitId: z.string().optional(),
  customerId: z.string().optional(),
  orderType: z.string(),
  from: z.string(),
  to: z.string(),
});

orderWindowsRouter.get("/", authenticate, authorize("order.read"), async (req, res, next) => {
  try {
    const query = querySchema.parse(req.query);
    const customerId = resolveScopedCustomerId(req.context!, query.customerId);
    const result = await getOrderWindows({
      customerId,
      unitId: query.unitId ? BigInt(query.unitId) : undefined,
      orderType: query.orderType,
      from: query.from,
      to: query.to,
    });
    sendData(res, result);
  } catch (error) {
    next(error);
  }
});
