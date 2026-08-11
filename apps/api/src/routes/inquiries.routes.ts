import { Router } from "express";
import {
  inquiryMessageCreateSchema,
  inquiryThreadCreateSchema,
  inquiryThreadQuerySchema,
  inquiryThreadStatusUpdateSchema,
} from "@dan1/shared";
import { authenticate, authorize } from "../middleware/auth.js";
import { sendData, sendList, buildPageMeta } from "../lib/response.js";
import { paramId } from "../lib/http.js";
import { resolveOptionalScopedCustomerId } from "../lib/scope.js";
import {
  createInquiryThread,
  getInquiryThread,
  listInquiryThreads,
  markInquiryThreadRead,
  postInquiryMessage,
  updateInquiryThreadStatus,
} from "../services/inquiry.service.js";

export const inquiriesRouter = Router();

inquiriesRouter.use(authenticate);

inquiriesRouter.get("/threads", authorize("inquiry.read"), async (req, res, next) => {
  try {
    const query = inquiryThreadQuerySchema.parse(req.query);
    const customerId = resolveOptionalScopedCustomerId(req.context!, query.customerId);
    const { items, totalCount } = await listInquiryThreads({
      ctx: req.context!,
      customerId,
      status: query.status,
      page: query.page,
      perPage: query.perPage,
    });
    sendList(res, items, buildPageMeta(query.page, query.perPage, totalCount));
  } catch (error) {
    next(error);
  }
});

inquiriesRouter.post("/threads", authorize("inquiry.create"), async (req, res, next) => {
  try {
    const input = inquiryThreadCreateSchema.parse(req.body);
    const created = await createInquiryThread({
      ctx: req.context!,
      customerId: input.customerId ? BigInt(input.customerId) : undefined,
      subject: input.subject,
      body: input.body,
    });
    sendData(res, created, 201);
  } catch (error) {
    next(error);
  }
});

inquiriesRouter.get("/threads/:id", authorize("inquiry.read"), async (req, res, next) => {
  try {
    const thread = await getInquiryThread(BigInt(paramId(req.params.id)), req.context!);
    sendData(res, thread);
  } catch (error) {
    next(error);
  }
});

inquiriesRouter.patch("/threads/:id", authorize("inquiry.reply"), async (req, res, next) => {
  try {
    const input = inquiryThreadStatusUpdateSchema.parse(req.body);
    const updated = await updateInquiryThreadStatus(
      BigInt(paramId(req.params.id)),
      req.context!,
      input.status,
    );
    sendData(res, updated);
  } catch (error) {
    next(error);
  }
});

inquiriesRouter.post("/threads/:id/messages", authorize("inquiry.reply"), async (req, res, next) => {
  try {
    const input = inquiryMessageCreateSchema.parse(req.body);
    const message = await postInquiryMessage(BigInt(paramId(req.params.id)), req.context!, input.body);
    sendData(res, message, 201);
  } catch (error) {
    next(error);
  }
});

inquiriesRouter.patch("/threads/:id/read", authorize("inquiry.read"), async (req, res, next) => {
  try {
    const result = await markInquiryThreadRead(BigInt(paramId(req.params.id)), req.context!);
    sendData(res, result);
  } catch (error) {
    next(error);
  }
});
