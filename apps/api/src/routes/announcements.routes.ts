import { Router } from "express";
import { prisma } from "@dan1/database";
import { z } from "zod";
import { announcementSchema } from "@dan1/shared";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/auth.js";
import { buildPageMeta, sendData, sendList } from "../lib/response.js";
import { paramId } from "../lib/http.js";
import { createMasterRouter } from "./masters/crud-factory.js";
import { listAnnouncementFeed, markAnnouncementRead } from "../services/announcement.service.js";

export const announcementsRouter = Router();

const feedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
});

announcementsRouter.get("/feed", authenticate, authorize("announcement.read"), async (req, res, next) => {
  try {
    const query = feedQuerySchema.parse(req.query);
    const result = await listAnnouncementFeed({
      ctx: req.context!,
      page: query.page,
      perPage: query.perPage,
      category: query.category,
    });
    sendList(res, result.items, buildPageMeta(query.page, query.perPage, result.totalCount));
  } catch (error) {
    next(error);
  }
});

announcementsRouter.post("/:id/read", authenticate, authorize("announcement.read"), async (req, res, next) => {
  try {
    const id = BigInt(paramId(req.params.id));
    await markAnnouncementRead(req.context!, id);
    sendData(res, { read: true });
  } catch (error) {
    next(error);
  }
});

export const announcementsAdminRouter = createMasterRouter({
  entityType: "announcement",
  model: prisma.announcement,
  createSchema: announcementSchema,
  updateSchema: announcementSchema.partial(),
  searchFields: ["title", "body"],
  defaultSortField: "publishFrom",
  softDelete: false,
  readPermission: "announcement.read",
  writePermission: "announcement.manage",
  toCreateData: (input) => ({
    ...input,
    publishFrom: new Date(input.publishFrom),
    publishTo: input.publishTo ? new Date(input.publishTo) : null,
    targetScopeId: input.targetScopeId ? BigInt(input.targetScopeId) : null,
  }),
  toUpdateData: (input) => ({
    ...input,
    ...(input.publishFrom ? { publishFrom: new Date(input.publishFrom) } : {}),
    ...(input.publishTo !== undefined ? { publishTo: input.publishTo ? new Date(input.publishTo) : null } : {}),
    ...(input.targetScopeId !== undefined
      ? { targetScopeId: input.targetScopeId ? BigInt(input.targetScopeId) : null }
      : {}),
  }),
});

announcementsRouter.use(announcementsAdminRouter);
