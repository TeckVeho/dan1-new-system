import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveScopedCustomerId } from "../../lib/scope.js";
import { sendData } from "../../lib/response.js";
import {
  addAllergenEntryRow,
  getOrderEntry,
  saveOrderEntry,
  type OrderEntrySaveCell,
} from "../../services/order-entry.service.js";

export const orderEntryRouter = Router();

orderEntryRouter.use(authenticate);

const entryQuerySchema = z.object({
  customerId: z.string().optional(),
  weekStart: z.string(),
});

orderEntryRouter.get("/entry", authorize("order.read"), async (req, res, next) => {
  try {
    const query = entryQuerySchema.parse(req.query);
    const customerId = resolveScopedCustomerId(req.context!, query.customerId);
    const result = await getOrderEntry({ customerId, weekStart: query.weekStart });
    sendData(res, result);
  } catch (error) {
    next(error);
  }
});

const entryCellSchema = z.object({
  rowType: z.enum(["meal", "allergen", "rice"]),
  rowKey: z.string(),
  unitId: z.string(),
  serviceDate: z.string(),
  quantity: z.number().int().min(0),
  version: z.number().int().min(0).nullable().optional(),
  mealTypeId: z.string().optional(),
  menuKindId: z.string().optional(),
  allergenTypeId: z.string().optional(),
  riceType: z.string().optional(),
  orderId: z.string().nullable().optional(),
});

const putEntrySchema = z.object({
  customerId: z.string().optional(),
  weekStart: z.string().optional(),
  commit: z.boolean(),
  cells: z.array(entryCellSchema).min(1).max(2000),
});

orderEntryRouter.put("/entry", authorize("order.create", "order.update"), async (req, res, next) => {
  try {
    const input = putEntrySchema.parse(req.body);
    const customerId = resolveScopedCustomerId(req.context!, input.customerId);
    const result = await saveOrderEntry(
      req.context!,
      customerId,
      input.commit,
      input.cells as OrderEntrySaveCell[],
    );
    sendData(res, result);
  } catch (error) {
    next(error);
  }
});

const addAllergenSchema = z.object({
  customerId: z.string().optional(),
  weekStart: z.string(),
  unitId: z.string(),
  allergenTypeId: z.string(),
});

orderEntryRouter.post("/entry/allergen-row", authorize("order.create"), async (req, res, next) => {
  try {
    const input = addAllergenSchema.parse(req.body);
    const customerId = resolveScopedCustomerId(req.context!, input.customerId);
    const result = await addAllergenEntryRow(
      req.context!,
      customerId,
      input.weekStart,
      input.unitId,
      input.allergenTypeId,
    );
    sendData(res, result);
  } catch (error) {
    next(error);
  }
});
