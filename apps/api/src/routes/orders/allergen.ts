import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveScopedCustomerId } from "../../lib/scope.js";
import { sendData } from "../../lib/response.js";
import { paramId } from "../../lib/http.js";
import { listAllergenOrders, createAllergenOrder, updateAllergenOrder } from "../../services/rice-allergen.service.js";

export const allergenOrdersRouter = Router();

allergenOrdersRouter.use(authenticate);

const allergenQuerySchema = z.object({
  customerId: z.string().optional(),
  unitId: z.string().optional(),
  dateFrom: z.string(),
  dateTo: z.string(),
});

allergenOrdersRouter.get("/allergen", authorize("order.read"), async (req, res, next) => {
  try {
    const query = allergenQuerySchema.parse(req.query);
    const customerId = resolveScopedCustomerId(req.context!, query.customerId);
    const items = await listAllergenOrders(customerId, new Date(query.dateFrom), new Date(query.dateTo), query.unitId ? BigInt(query.unitId) : undefined);
    sendData(res, items);
  } catch (error) {
    next(error);
  }
});

const createAllergenSchema = z.object({
  customerId: z.string().optional(),
  unitId: z.string(),
  serviceDate: z.string(),
  allergenTypeId: z.string(),
  quantity: z.number().int().min(0),
});

allergenOrdersRouter.post("/allergen", authorize("order.create"), async (req, res, next) => {
  try {
    const input = createAllergenSchema.parse(req.body);
    const customerId = resolveScopedCustomerId(req.context!, input.customerId);
    const created = await createAllergenOrder({
      ctx: req.context!,
      customerId,
      unitId: BigInt(input.unitId),
      serviceDate: new Date(input.serviceDate),
      allergenTypeId: BigInt(input.allergenTypeId),
      quantity: input.quantity,
    });
    sendData(res, created, 201);
  } catch (error) {
    next(error);
  }
});

const updateAllergenSchema = z.object({
  quantity: z.number().int().min(0),
  version: z.number().int().min(0),
});

allergenOrdersRouter.patch("/allergen/:id", authorize("order.update"), async (req, res, next) => {
  try {
    const input = updateAllergenSchema.parse(req.body);
    const updated = await updateAllergenOrder({ ctx: req.context!, id: BigInt(paramId(req.params.id)), ...input });
    sendData(res, updated);
  } catch (error) {
    next(error);
  }
});
