import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../middleware/auth.js";
import { sendList, buildPageMeta } from "../lib/response.js";
import { listAuditLogs } from "../services/audit.service.js";

export const auditLogsRouter = Router();

const querySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).default(50),
});

auditLogsRouter.get("/", authenticate, authorize("admin.audit_log.read"), async (req, res, next) => {
  try {
    const query = querySchema.parse(req.query);
    const { items, totalCount } = await listAuditLogs(query);
    sendList(res, items, buildPageMeta(query.page, query.perPage, totalCount));
  } catch (error) {
    next(error);
  }
});
