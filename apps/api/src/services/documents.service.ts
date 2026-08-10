import { prisma } from "@dan1/database";
import { ForbiddenError, NotFoundError } from "../lib/errors.js";
import { resolveCustomerSetting } from "./settings.service.js";
import type { RequestContext } from "../types/context.js";
import { recordAuditLog } from "./audit.service.js";

export type ListDocumentsQuery = {
  ctx: RequestContext;
  customerId?: bigint;
  documentType?: string;
  serviceMonth?: string;
  page: number;
  perPage: number;
};

function facilityCustomerId(ctx: RequestContext): bigint | null {
  if (ctx.userType !== "facility") return null;
  return ctx.impersonatingCustomerId ?? ctx.customerId ?? null;
}

export async function listDocuments(query: ListDocumentsQuery) {
  const facilityId = facilityCustomerId(query.ctx);
  const where = {
    ...(facilityId
      ? {
          isActive: true,
          OR: [{ customerId: facilityId }, { customerId: null }],
          versions: { some: {} },
        }
      : {}),
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.documentType ? { documentType: query.documentType } : {}),
    ...(query.serviceMonth ? { serviceMonth: query.serviceMonth } : {}),
  };

  const [items, totalCount] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        versions: { orderBy: { versionNo: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    prisma.document.count({ where }),
  ]);
  return { items, totalCount };
}

export type CreateDocumentInput = { ctx: RequestContext; customerId?: bigint; documentType: string; title: string; serviceMonth: string };

export async function createDocument(input: CreateDocumentInput) {
  const created = await prisma.document.create({
    data: {
      customerId: input.customerId ?? null,
      documentType: input.documentType,
      title: input.title,
      serviceMonth: input.serviceMonth,
      isActive: false,
    },
  });
  await recordAuditLog({ ctx: input.ctx, action: "create", entityType: "document", entityId: created.id, after: created });
  return created;
}

export type CreateDocumentVersionInput = { ctx: RequestContext; documentId: bigint; fileId: bigint; asOf?: Date };

/**
 * Creates a new version snapshotting the customer settings currently in
 * effect (FR-402). Past versions never change even if settings are later
 * updated — the read path always uses `settingsSnapshot`, never a live
 * lookup (REQ-16).
 */
export async function createDocumentVersion(input: CreateDocumentVersionInput) {
  const document = await prisma.document.findUnique({ where: { id: input.documentId } });
  if (!document) throw new NotFoundError("資料が見つかりません");

  const asOf = input.asOf ?? new Date();
  const snapshot = document.customerId ? await resolveCustomerSetting(document.customerId, asOf) : null;

  const latest = await prisma.documentVersion.findFirst({
    where: { documentId: input.documentId },
    orderBy: { versionNo: "desc" },
  });
  const versionNo = (latest?.versionNo ?? 0) + 1;

  if (latest) {
    await prisma.documentVersion.update({ where: { id: latest.id }, data: { supersededAt: new Date() } });
  }

  const created = await prisma.documentVersion.create({
    data: {
      documentId: input.documentId,
      versionNo,
      fileId: input.fileId,
      settingsSnapshot: (snapshot?.settings ?? {}) as never,
      generatedAt: new Date(),
      generatedBy: input.ctx.userId ?? 0n,
    },
  });
  await recordAuditLog({ ctx: input.ctx, action: "create", entityType: "document_version", entityId: created.id, after: created });
  return created;
}

export async function listDocumentVersions(documentId: bigint) {
  return prisma.documentVersion.findMany({ where: { documentId }, orderBy: { versionNo: "desc" } });
}

export async function getDocumentById(ctx: RequestContext, documentId: bigint) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      customer: { select: { name: true } },
      versions: { orderBy: { versionNo: "desc" }, take: 1, include: { file: true } },
    },
  });
  if (!document) throw new NotFoundError("資料が見つかりません");

  const facilityId = facilityCustomerId(ctx);
  if (facilityId) {
    const allowed = document.isActive && (document.customerId === null || document.customerId === facilityId);
    if (!allowed || document.versions.length === 0) throw new ForbiddenError("この資料を閲覧する権限がありません");
  }

  return document;
}

export async function setDocumentPublished(ctx: RequestContext, documentId: bigint, published: boolean) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { versions: { take: 1 } },
  });
  if (!document) throw new NotFoundError("資料が見つかりません");
  if (published && document.versions.length === 0) {
    throw new ForbiddenError("版が登録されていない資料は公開できません");
  }

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: { isActive: published },
  });

  await recordAuditLog({
    ctx,
    action: "update",
    entityType: "document",
    entityId: documentId,
    before: { isActive: document.isActive },
    after: { isActive: published },
  });

  return updated;
}

export type CreatePlatingInstructionInput = {
  ctx: RequestContext;
  serviceDate: Date;
  menuTemplateId?: bigint;
  body: string;
  saveAsTemplate?: boolean;
  templateTitle?: string;
};

export async function createPlatingInstruction(input: CreatePlatingInstructionInput) {
  const template = input.menuTemplateId
    ? await prisma.menuTemplate.findUnique({ where: { id: input.menuTemplateId } })
    : null;

  const created = await prisma.$transaction(async (tx) => {
    let menuTemplateId = input.menuTemplateId ?? null;

    if (input.saveAsTemplate) {
      const title = input.templateTitle?.trim() || `盛付指示 ${input.serviceDate.toISOString().slice(0, 10)}`;
      const savedTemplate = await tx.menuTemplate.create({
        data: {
          title,
          body: input.body,
          tags: ["手動登録"],
          sortOrder: 9999,
          isActive: true,
        },
      });
      menuTemplateId = savedTemplate.id;
    }

    const instruction = await tx.platingInstruction.create({
      data: {
        serviceDate: input.serviceDate,
        menuTemplateId,
        bodySnapshot: input.body,
        settingsSnapshot: template ? { menuTemplateId: template.id.toString(), tags: template.tags ?? [] } : {},
        createdBy: input.ctx.userId ?? null,
      },
    });

    if (menuTemplateId) {
      await tx.menuTemplate.update({
        where: { id: menuTemplateId },
        data: { useCount: { increment: 1 }, lastUsedAt: new Date() },
      });
    }

    return instruction;
  });

  await recordAuditLog({ ctx: input.ctx, action: "create", entityType: "plating_instruction", entityId: created.id, after: created });
  return created;
}

export type ListPlatingInstructionsQuery = { serviceDateFrom?: Date; serviceDateTo?: Date; page: number; perPage: number };

export async function listPlatingInstructions(query: ListPlatingInstructionsQuery) {
  const where = {
    ...(query.serviceDateFrom || query.serviceDateTo
      ? {
          serviceDate: {
            ...(query.serviceDateFrom ? { gte: query.serviceDateFrom } : {}),
            ...(query.serviceDateTo ? { lte: query.serviceDateTo } : {}),
          },
        }
      : {}),
  };
  const [items, totalCount] = await Promise.all([
    prisma.platingInstruction.findMany({
      where,
      include: { menuTemplate: { select: { title: true } } },
      orderBy: { serviceDate: "desc" },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    prisma.platingInstruction.count({ where }),
  ]);
  return { items, totalCount };
}

export async function getPlatingInstructionById(id: bigint) {
  const item = await prisma.platingInstruction.findUnique({
    where: { id },
    include: { menuTemplate: { select: { title: true } } },
  });
  if (!item) throw new NotFoundError("盛付指示書が見つかりません");
  return item;
}
