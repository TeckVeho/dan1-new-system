import { Router } from "express";
import { z } from "zod";
import {
  documentCreateSchema,
  documentOutputPreviewSchema,
  menuTemplateBulkArchiveSchema,
  menuTemplateMergeSchema,
  menuTemplateSchema,
  platingInstructionSchema,
} from "@dan1/shared";
import { authenticate, authorize } from "../../middleware/auth.js";
import { sendData, sendList, buildPageMeta } from "../../lib/response.js";
import { paramId } from "../../lib/http.js";
import { createMasterRouter } from "../masters/crud-factory.js";
import { prisma } from "@dan1/database";
import {
  listDocuments,
  createDocument,
  createDocumentVersion,
  listDocumentVersions,
  createPlatingInstruction,
  listPlatingInstructions,
  getDocumentById,
  setDocumentPublished,
  getPlatingInstructionById,
} from "../../services/documents.service.js";
import {
  listDocumentOutputMatrix,
  resolveDocumentOutputTypes,
} from "../../services/document-output-rules.service.js";
import {
  bulkArchiveMenuTemplates,
  findDuplicateMenuTemplates,
  mergeMenuTemplates,
} from "../../services/menu-templates.service.js";

export const documentsRouter = Router();

documentsRouter.use(authenticate);

documentsRouter.get("/output-rules/matrix", authorize("master.read"), async (req, res, next) => {
  try {
    const asOf = req.query.asOf ? new Date(String(req.query.asOf)) : new Date();
    const matrix = await listDocumentOutputMatrix(asOf);
    sendData(res, matrix);
  } catch (error) {
    next(error);
  }
});

documentsRouter.post("/output-rules/preview", authorize("master.read"), async (req, res, next) => {
  try {
    const input = documentOutputPreviewSchema.parse(req.body);
    const asOf = input.asOf ? new Date(input.asOf) : new Date();
    const resolved = await resolveDocumentOutputTypes(BigInt(input.customerId), asOf);
    sendData(res, resolved);
  } catch (error) {
    next(error);
  }
});

documentsRouter.get("/templates/duplicates", authorize("document.read"), async (_req, res, next) => {
  try {
    const groups = await findDuplicateMenuTemplates();
    sendData(res, groups);
  } catch (error) {
    next(error);
  }
});

documentsRouter.post("/templates/bulk-archive", authorize("document.upload"), async (req, res, next) => {
  try {
    const input = menuTemplateBulkArchiveSchema.parse(req.body);
    const result = await bulkArchiveMenuTemplates({
      ctx: req.context!,
      ids: input.ids?.map((id) => BigInt(id)),
      unusedSinceDays: input.unusedSinceDays,
    });
    sendData(res, result);
  } catch (error) {
    next(error);
  }
});

documentsRouter.post("/templates/merge", authorize("document.upload"), async (req, res, next) => {
  try {
    const input = menuTemplateMergeSchema.parse(req.body);
    const result = await mergeMenuTemplates({
      ctx: req.context!,
      keepId: BigInt(input.keepId),
      mergeIds: input.mergeIds.map((id) => BigInt(id)),
    });
    sendData(res, result);
  } catch (error) {
    next(error);
  }
});

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

documentsRouter.get("/plating-instructions/:id", authorize("document.read"), async (req, res, next) => {
  try {
    const item = await getPlatingInstructionById(BigInt(paramId(req.params.id)));
    sendData(res, item);
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
      saveAsTemplate: input.saveAsTemplate,
      templateTitle: input.templateTitle,
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
      ctx: req.context!,
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
    const document = await getDocumentById(req.context!, BigInt(paramId(req.params.id)));
    const versions = await listDocumentVersions(document.id);
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

const publishSchema = z.object({ published: z.boolean() });

documentsRouter.post("/:id/publish", authorize("document.publish"), async (req, res, next) => {
  try {
    const input = publishSchema.parse(req.body);
    const updated = await setDocumentPublished(req.context!, BigInt(paramId(req.params.id)), input.published);
    sendData(res, updated);
  } catch (error) {
    next(error);
  }
});

documentsRouter.get("/:id", authorize("document.read"), async (req, res, next) => {
  try {
    const document = await getDocumentById(req.context!, BigInt(paramId(req.params.id)));
    sendData(res, document);
  } catch (error) {
    next(error);
  }
});
