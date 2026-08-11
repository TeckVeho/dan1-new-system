import { Router } from "express";
import { z } from "zod";
import { invoiceCloseSchema, invoiceCorrectSchema, deliveryDatePreviewSchema } from "@dan1/shared";
import { authenticate, authorize } from "../middleware/auth.js";
import { sendData, sendList, sendNoContent, buildPageMeta } from "../lib/response.js";
import { paramId } from "../lib/http.js";
import { resolveOptionalScopedCustomerId } from "../lib/scope.js";
import {
  listInvoices,
  getInvoice,
  closeInvoices,
  previewInvoices,
  getInvoiceCorrections,
  issueInvoice,
  correctInvoice,
  deleteDraftInvoice,
} from "../services/billing.service.js";
import { previewDeliveryDates } from "../services/delivery-date.service.js";
import { getInvoiceDownloadUrl } from "../services/invoice-pdf.service.js";

export const invoicesRouter = Router();

invoicesRouter.use(authenticate);

const listQuerySchema = z.object({
  invoiceMonth: z.string().optional(),
  customerId: z.string().optional(),
  status: z.enum(["draft", "issued", "corrected", "cancelled"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).default(20),
});

invoicesRouter.get("/", authorize("invoice.read"), async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const customerId = resolveOptionalScopedCustomerId(req.context!, query.customerId);
    const { items, totalCount } = await listInvoices({
      ctx: req.context!,
      invoiceMonth: query.invoiceMonth,
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

invoicesRouter.get("/delivery-date/preview", authorize("master.read"), async (req, res, next) => {
  try {
    const input = deliveryDatePreviewSchema.parse(req.query);
    const result = await previewDeliveryDates({
      customerId: BigInt(input.customerId),
      serviceDate: new Date(input.serviceDate),
    });
    sendData(res, result);
  } catch (error) {
    next(error);
  }
});

invoicesRouter.get("/:id/corrections", authorize("invoice.read"), async (req, res, next) => {
  try {
    const result = await getInvoiceCorrections(BigInt(paramId(req.params.id)), req.context!);
    sendData(res, result);
  } catch (error) {
    next(error);
  }
});

invoicesRouter.get("/:id/download", authorize("invoice.read"), async (req, res, next) => {
  try {
    const result = await getInvoiceDownloadUrl(BigInt(paramId(req.params.id)), req.context!);
    sendData(res, result);
  } catch (error) {
    next(error);
  }
});

invoicesRouter.get("/:id", authorize("invoice.read"), async (req, res, next) => {
  try {
    const invoice = await getInvoice(BigInt(paramId(req.params.id)), req.context!);
    sendData(res, invoice);
  } catch (error) {
    next(error);
  }
});

invoicesRouter.post("/preview", authorize("invoice.close"), async (req, res, next) => {
  try {
    const input = invoiceCloseSchema.parse(req.body);
    const result = await previewInvoices({
      ctx: req.context!,
      invoiceMonth: input.invoiceMonth,
      customerIds: input.customerIds?.map((id) => BigInt(id)),
    });
    sendData(res, result);
  } catch (error) {
    next(error);
  }
});

invoicesRouter.post("/close", authorize("invoice.close"), async (req, res, next) => {
  try {
    const input = invoiceCloseSchema.parse(req.body);
    const result = await closeInvoices({
      ctx: req.context!,
      invoiceMonth: input.invoiceMonth,
      customerIds: input.customerIds?.map((id) => BigInt(id)),
    });
    sendData(res, result, 201);
  } catch (error) {
    next(error);
  }
});

invoicesRouter.post("/:id/issue", authorize("invoice.issue"), async (req, res, next) => {
  try {
    const invoice = await issueInvoice({ ctx: req.context!, invoiceId: BigInt(paramId(req.params.id)) });
    sendData(res, invoice);
  } catch (error) {
    next(error);
  }
});

invoicesRouter.post("/:id/correct", authorize("invoice.correct"), async (req, res, next) => {
  try {
    const input = invoiceCorrectSchema.parse(req.body);
    const invoice = await correctInvoice({
      ctx: req.context!,
      invoiceId: BigInt(paramId(req.params.id)),
      lines: input.lines,
      reason: input.reason,
    });
    sendData(res, invoice, 201);
  } catch (error) {
    next(error);
  }
});

invoicesRouter.delete("/:id", authorize("invoice.close"), async (req, res, next) => {
  try {
    await deleteDraftInvoice({ ctx: req.context!, invoiceId: BigInt(paramId(req.params.id)) });
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
});
