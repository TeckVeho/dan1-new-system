import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveScopedCustomerId } from "../../lib/scope.js";
import { sendData } from "../../lib/response.js";
import { getRiceOrders, saveRiceOrders, type RiceOrderCell } from "../../services/rice-allergen.service.js";

export const riceOrdersRouter = Router();

riceOrdersRouter.use(authenticate);

const riceQuerySchema = z.object({
  customerId: z.string().optional(),
  unitId: z.string().optional(),
  dateFrom: z.string(),
  dateTo: z.string(),
});

riceOrdersRouter.get("/rice", authorize("order.read"), async (req, res, next) => {
  try {
    const query = riceQuerySchema.parse(req.query);
    const customerId = resolveScopedCustomerId(req.context!, query.customerId);
    const items = await getRiceOrders(customerId, new Date(query.dateFrom), new Date(query.dateTo), query.unitId ? BigInt(query.unitId) : undefined);
    sendData(res, items);
  } catch (error) {
    next(error);
  }
});

const riceCellSchema = z.object({
  unitId: z.string(),
  serviceDate: z.string(),
  riceType: z.string(),
  quantity: z.number().int().min(0),
  version: z.number().int().min(0).nullable().optional(),
});

const putRiceSchema = z.object({
  customerId: z.string().optional(),
  commit: z.boolean().default(false),
  cells: z.array(riceCellSchema).min(1).max(500),
});

riceOrdersRouter.put("/rice", authorize("order.create", "order.update"), async (req, res, next) => {
  try {
    const input = putRiceSchema.parse(req.body);
    const customerId = resolveScopedCustomerId(req.context!, input.customerId);
    const saved = await saveRiceOrders(req.context!, customerId, input.commit, input.cells as RiceOrderCell[]);
    sendData(res, { saved: saved.length, cells: saved });
  } catch (error) {
    next(error);
  }
});
