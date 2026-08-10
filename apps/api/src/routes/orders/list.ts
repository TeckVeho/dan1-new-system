import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveOptionalScopedCustomerId } from "../../lib/scope.js";
import { sendData, sendList, buildPageMeta } from "../../lib/response.js";
import { listOrders, patchMealOrder, exportOrdersCsv, getMealOrderById } from "../../services/orders.service.js";
import { paramId } from "../../lib/http.js";
import { ScopeViolationError } from "../../lib/errors.js";

export const orderListRouter = Router();

orderListRouter.use(authenticate);

const listQuerySchema = z.object({
  customerId: z.string().optional(),
  search: z.string().optional(),
  serviceDateFrom: z.string().optional(),
  serviceDateTo: z.string().optional(),
  unitId: z.string().optional(),
  mealTypeId: z.string().optional(),
  menuKindId: z.string().optional(),
  status: z.enum(["draft", "provisional", "confirmed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).default(50),
});

const exportQuerySchema = listQuerySchema.omit({ page: true, perPage: true });

orderListRouter.get("/export", authorize("order.export"), async (req, res, next) => {
  try {
    const query = exportQuerySchema.parse(req.query);
    const customerId = resolveOptionalScopedCustomerId(req.context!, query.customerId);
    const csv = await exportOrdersCsv({
      customerId,
      search: query.search,
      serviceDateFrom: query.serviceDateFrom ? new Date(query.serviceDateFrom) : undefined,
      serviceDateTo: query.serviceDateTo ? new Date(query.serviceDateTo) : undefined,
      unitId: query.unitId ? BigInt(query.unitId) : undefined,
      mealTypeId: query.mealTypeId ? BigInt(query.mealTypeId) : undefined,
      menuKindId: query.menuKindId ? BigInt(query.menuKindId) : undefined,
      status: query.status,
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
    res.send(`\uFEFF${csv}`);
  } catch (error) {
    next(error);
  }
});

orderListRouter.get("/", authorize("order.read"), async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const customerId = resolveOptionalScopedCustomerId(req.context!, query.customerId);
    const { items, totalCount } = await listOrders({
      customerId,
      search: query.search,
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

orderListRouter.get("/:id", authorize("order.read"), async (req, res, next) => {
  try {
    const orderId = BigInt(paramId(req.params.id));
    const item = await getMealOrderById(orderId);
    const ctx = req.context!;
    if (ctx.userType === "facility" && item.customerId !== ctx.customerId?.toString()) {
      throw new ScopeViolationError();
    }
    if (ctx.impersonatingCustomerId && item.customerId !== ctx.impersonatingCustomerId.toString()) {
      throw new ScopeViolationError();
    }
    sendData(res, item);
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
