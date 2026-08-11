import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { sendData, sendList, buildPageMeta } from "../lib/response.js";
import { paramId } from "../lib/http.js";
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notification.service.js";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

const listQuerySchema = z.object({
  isRead: z.coerce.boolean().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).default(20),
});

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const { items, totalCount } = await listNotifications(req.context!, query);
    sendList(res, items, buildPageMeta(query.page, query.perPage, totalCount));
  } catch (error) {
    next(error);
  }
});

notificationsRouter.get("/unread-count", async (req, res, next) => {
  try {
    const count = await countUnreadNotifications(req.context!);
    sendData(res, { count });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.patch("/:id/read", async (req, res, next) => {
  try {
    const id = BigInt(paramId(req.params.id));
    const updated = await markNotificationRead(req.context!, id);
    sendData(res, updated);
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/read-all", async (req, res, next) => {
  try {
    const result = await markAllNotificationsRead(req.context!);
    sendData(res, result);
  } catch (error) {
    next(error);
  }
});
