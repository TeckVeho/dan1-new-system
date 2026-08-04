import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../middleware/auth.js";
import { sendData, sendList, buildPageMeta } from "../lib/response.js";
import { paramId } from "../lib/http.js";
import { getJob, listJobs, cancelJob } from "../services/jobs.service.js";

export const jobsRouter = Router();

jobsRouter.use(authenticate);

const listQuerySchema = z.object({
  status: z.string().optional(),
  jobType: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).default(20),
});

jobsRouter.get("/", async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const { items, totalCount } = await listJobs(query);
    sendList(res, items, buildPageMeta(query.page, query.perPage, totalCount));
  } catch (error) {
    next(error);
  }
});

jobsRouter.get("/:id", async (req, res, next) => {
  try {
    const job = await getJob(BigInt(paramId(req.params.id)));
    sendData(res, job);
  } catch (error) {
    next(error);
  }
});

jobsRouter.post("/:id/cancel", authorize("admin.job.cancel"), async (req, res, next) => {
  try {
    const job = await cancelJob(BigInt(paramId(req.params.id)));
    sendData(res, job);
  } catch (error) {
    next(error);
  }
});
