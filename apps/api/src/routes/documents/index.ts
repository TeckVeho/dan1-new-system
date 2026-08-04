import { Router } from "express";
import { z } from "zod";
import { prisma } from "@dan1/database";
import { documentCreateSchema, menuTemplateSchema, platingInstructionSchema } from "@dan1/shared";
import { authenticate, authorize } from "../../middleware/auth.js";
import { sendData, sendList, buildPageMeta } from "../../lib/response.js";
import { NotFoundError } from "../../lib/errors.js";
import { paramId } from "../../lib/http.js";
import { createMasterRouter } from "../masters/crud-factory.js";
import {
  listDocuments,
  createDocument,
  createDocumentVersion,
  listDocumentVersions,
  createPlatingInstruction,
  listPlatingInstructions,
} from "../../services/documents.service.js";

export const documentsRouter = Router();

documentsRouter.use(authenticate);

// Static sub-resources must be registered before the `/:id` route below.
documentsRouter.use(
  "/templates",
  createMasterRouter({
    entityType: "menu_template",
    model: prisma.menuTemplate,
    createSchema: menuTemplateSchema,
    updateSchema: menuTemplateSchema.partial(),
    searchFields: ["title", "body"],
    readPermission: "document.read",
    writePermission: "document.upload",
  }),
);

const platingListQuerySchema = z.object({
  serviceDateFrom: z.string().optional(),
  serviceDateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).default(50),
});

documentsRouter.get("/plating-instructions", authorize("document.read"), async (req, res, next) => {
  try {
    const query = platingListQuerySchema.parse(req.query);
    const { items, totalCount } = await listPlatingInstructions({
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

documentsRouter.post("/plating-instructions", authorize("document.upload"), async (req, res, next) => {
  try {
    const input = platingInstructionSchema.parse(req.body);
    const created = await createPlatingInstruction({
      ctx: req.context!,
      serviceDate: new Date(input.serviceDate),
      menuTemplateId: input.menuTemplateId ? BigInt(input.menuTemplateId) : undefined,
      body: input.body,
    });
    sendData(res, created, 201);
  } catch (error) {
    next(error);
  }
});

const listQuerySchema = z.object({
  customerId: z.string().optional(),
  documentType: z.string().optional(),
  serviceMonth: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).default(20),
});

documentsRouter.get("/", authorize("document.read"), async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const { items, totalCount } = await listDocuments({
      customerId: query.customerId ? BigInt(query.customerId) : undefined,
      documentType: query.documentType,
      serviceMonth: query.serviceMonth,
      page: query.page,
      perPage: query.perPage,
    });
    sendList(res, items, buildPageMeta(query.page, query.perPage, totalCount));
  } catch (error) {
    next(error);
  }
});

documentsRouter.post("/", authorize("document.upload"), async (req, res, next) => {
  try {
    const input = documentCreateSchema.parse(req.body);
    const created = await createDocument({
      ctx: req.context!,
      customerId: input.customerId ? BigInt(input.customerId) : undefined,
      documentType: input.documentType,
      title: input.title,
      serviceMonth: input.serviceMonth,
    });
    sendData(res, created, 201);
  } catch (error) {
    next(error);
  }
});

documentsRouter.get("/:id/versions", authorize("document.read"), async (req, res, next) => {
  try {
    const versions = await listDocumentVersions(BigInt(paramId(req.params.id)));
    sendData(res, versions);
  } catch (error) {
    next(error);
  }
});

const createVersionSchema = z.object({ fileId: z.string() });

documentsRouter.post("/:id/versions", authorize("document.regenerate"), async (req, res, next) => {
  try {
    const input = createVersionSchema.parse(req.body);
    const created = await createDocumentVersion({
      ctx: req.context!,
      documentId: BigInt(paramId(req.params.id)),
      fileId: BigInt(input.fileId),
    });
    sendData(res, created, 201);
  } catch (error) {
    next(error);
  }
});

documentsRouter.get("/:id", authorize("document.read"), async (req, res, next) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: BigInt(paramId(req.params.id)) },
      include: { versions: { orderBy: { versionNo: "desc" }, take: 1, include: { file: true } } },
    });
    if (!document) throw new NotFoundError("資料が見つかりません");
    sendData(res, document);
  } catch (error) {
    next(error);
  }
});
