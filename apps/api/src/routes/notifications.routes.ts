import { Router } from "express";
import { z } from "zod";
import { prisma } from "@dan1/database";
import { authenticate } from "../middleware/auth.js";
import { sendData, sendList, buildPageMeta } from "../lib/response.js";
import { NotFoundError } from "../lib/errors.js";
import { paramId } from "../lib/http.js";

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
    const ctx = req.context!;
    const where = {
      ...(ctx.userType === "internal"
        ? { userId: ctx.userId ?? undefined }
        : { customerUserId: ctx.customerUserId ?? undefined }),
      ...(query.isRead !== undefined ? { isRead: query.isRead } : {}),
      ...(query.category ? { category: query.category } : {}),
    };
    const [items, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
      prisma.notification.count({ where }),
    ]);
    sendList(res, items, buildPageMeta(query.page, query.perPage, totalCount));
  } catch (error) {
    next(error);
  }
});

notificationsRouter.patch("/:id/read", async (req, res, next) => {
  try {
    const id = BigInt(paramId(req.params.id));
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError();
    const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
    sendData(res, updated);
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/read-all", async (req, res, next) => {
  try {
    const ctx = req.context!;
    await prisma.notification.updateMany({
      where: {
        ...(ctx.userType === "internal"
          ? { userId: ctx.userId ?? undefined }
          : { customerUserId: ctx.customerUserId ?? undefined }),
        isRead: false,
      },
      data: { isRead: true },
    });
    sendData(res, { updated: true });
  } catch (error) {
    next(error);
  }
});
