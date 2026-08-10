import { Router } from "express";
import { z } from "zod";
import { prisma } from "@dan1/database";
import { serializeBigInt } from "@dan1/shared";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveScopedCustomerId } from "../../lib/scope.js";
import { sendList, buildPageMeta } from "../../lib/response.js";
import { getOrderHistory, getUnenteredFacilities, getOrderSummary, getMealOrderChanges, updateOrderAlertStatus } from "../../services/orders.service.js";
import { sendData } from "../../lib/response.js";
import { NotFoundError } from "../../lib/errors.js";
import { paramId } from "../../lib/http.js";

export const orderHistoryRouter = Router();

orderHistoryRouter.use(authenticate);

const historyQuerySchema = z.object({
  customerId: z.string().optional(),
  serviceDateFrom: z.string().optional(),
  serviceDateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).default(50),
});

orderHistoryRouter.get("/history", authorize("order.read"), async (req, res, next) => {
  try {
    const query = historyQuerySchema.parse(req.query);
    const customerId = resolveScopedCustomerId(req.context!, query.customerId);
    const { items, totalCount } = await getOrderHistory({
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

const alertsQuerySchema = z.object({
  serviceDateFrom: z.string(),
  serviceDateTo: z.string(),
});

orderHistoryRouter.get("/unentered-facilities", authorize("order_alert.read"), async (req, res, next) => {
  try {
    const query = alertsQuerySchema.parse(req.query);
    const { alerts, excluded } = await getUnenteredFacilities({
      serviceDateFrom: new Date(query.serviceDateFrom),
      serviceDateTo: new Date(query.serviceDateTo),
    });
    res.status(200).json({
      data: serializeBigInt(alerts),
      meta: { totalCount: alerts.length },
      excluded,
    });
  } catch (error) {
    next(error);
  }
});

const alertStatusSchema = z.object({
  customerId: z.string(),
  serviceDate: z.string(),
  status: z.string(),
  note: z.string().optional(),
});

orderHistoryRouter.post("/alerts/status", authorize("order_alert.update"), async (req, res, next) => {
  try {
    const input = alertStatusSchema.parse(req.body);
    const updated = await updateOrderAlertStatus({
      customerId: BigInt(input.customerId),
      serviceDate: new Date(input.serviceDate),
      status: input.status,
      handledBy: req.context!.userId ?? null,
      note: input.note ?? null,
    });
    sendData(res, updated);
  } catch (error) {
    next(error);
  }
});

const summaryQuerySchema = z.object({
  customerId: z.string().optional(),
  serviceDateFrom: z.string(),
  serviceDateTo: z.string(),
  groupBy: z.enum(["unit", "day", "month"]).default("day"),
});

orderHistoryRouter.get("/summary", authorize("order.read"), async (req, res, next) => {
  try {
    const query = summaryQuerySchema.parse(req.query);
    const customerId = resolveScopedCustomerId(req.context!, query.customerId);
    const result = await getOrderSummary({
      customerId,
      serviceDateFrom: new Date(query.serviceDateFrom),
      serviceDateTo: new Date(query.serviceDateTo),
      groupBy: query.groupBy,
    });
    sendData(res, result);
  } catch (error) {
    next(error);
  }
});

orderHistoryRouter.get("/:id/changes", authorize("order.read"), async (req, res, next) => {
  try {
    const orderId = BigInt(paramId(req.params.id));
    const order = await prisma.mealOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError("注文が見つかりません");
    const items = await getMealOrderChanges(orderId);
    sendList(res, serializeBigInt(items), buildPageMeta(1, items.length, items.length));
  } catch (error) {
    next(error);
  }
});
