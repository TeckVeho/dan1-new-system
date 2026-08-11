import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { sendAccepted, sendData } from "../lib/response.js";
import { paramId } from "../lib/http.js";
import { generateReportJob, listReportCatalog } from "../services/reports/report.service.js";
import { getReportDefinition } from "../services/reports/registry.js";
import { NotFoundError } from "../lib/errors.js";

export const reportsRouter = Router();

reportsRouter.use(authenticate);

reportsRouter.get("/", async (req, res, next) => {
  try {
    const ctx = req.context!;
    const hasAny =
      ctx.permissions.has("*") ||
      ctx.permissions.has("report.read") ||
      ctx.permissions.has("report.generate") ||
      ctx.permissions.has("procurement.schedule.read") ||
      ctx.permissions.has("order.export");
    if (!hasAny) {
      throw new NotFoundError("帳票が見つかりません");
    }
    sendData(res, listReportCatalog(ctx));
  } catch (error) {
    next(error);
  }
});

const generateBodySchema = z.object({
  params: z.record(z.string(), z.unknown()).default({}),
});

reportsRouter.post("/:key/generate", async (req, res, next) => {
  try {
    const key = paramId(req.params.key);
    const body = generateBodySchema.parse(req.body);
    const definition = getReportDefinition(key);
    if (!definition) throw new NotFoundError("帳票が見つかりません");

    const ctx = req.context!;
    if (!ctx.permissions.has("*") && !ctx.permissions.has(definition.permission)) {
      throw new NotFoundError("帳票が見つかりません");
    }

    const job = await generateReportJob({
      ctx,
      reportKey: key,
      params: body.params,
    });

    sendAccepted(res, {
      jobId: job.id,
      status: job.status,
      reportKey: key,
      statusUrl: `/api/v1/jobs/${job.id}`,
    });
  } catch (error) {
    next(error);
  }
});
