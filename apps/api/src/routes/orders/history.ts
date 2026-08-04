import { Router } from "express";
import { z } from "zod";
import { serializeBigInt } from "@dan1/shared";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveScopedCustomerId } from "../../lib/scope.js";
import { sendList, buildPageMeta } from "../../lib/response.js";
import { getOrderHistory, getUnenteredFacilities } from "../../services/orders.service.js";

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
