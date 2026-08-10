import { prisma } from "@dan1/database";
import { NotFoundError, ValidationError } from "../lib/errors.js";
import type { RequestContext } from "../types/context.js";
import { recordAuditLog } from "./audit.service.js";

function normalizeBody(body: string): string {
  return body.replace(/\s+/g, " ").trim().toLowerCase();
}

export async function findDuplicateMenuTemplates() {
  const templates = await prisma.menuTemplate.findMany({
    where: { deletedAt: null, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  const groups = new Map<string, typeof templates>();
  for (const template of templates) {
    const key = normalizeBody(template.body);
    const bucket = groups.get(key) ?? [];
    bucket.push(template);
    groups.set(key, bucket);
  }

  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({
      normalizedBody: group[0]!.body.slice(0, 80),
      templates: group.map((template) => ({
        id: template.id.toString(),
        title: template.title,
        body: template.body,
        useCount: template.useCount,
        lastUsedAt: template.lastUsedAt,
      })),
    }));
}

export type BulkArchiveMenuTemplatesInput = {
  ctx: RequestContext;
  ids?: bigint[];
  unusedSinceDays?: number;
};

export async function bulkArchiveMenuTemplates(input: BulkArchiveMenuTemplatesInput) {
  const where =
    input.ids && input.ids.length > 0
      ? { id: { in: input.ids }, deletedAt: null, isActive: true }
      : input.unusedSinceDays
        ? {
            deletedAt: null,
            isActive: true,
            useCount: 0,
            OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: daysAgo(input.unusedSinceDays) } }],
          }
        : null;

  if (!where) throw new ValidationError("アーカイブ対象を指定してください");

  const targets = await prisma.menuTemplate.findMany({ where, select: { id: true } });
  if (targets.length === 0) return { archived: 0 };

  const now = new Date();
  await prisma.menuTemplate.updateMany({
    where: { id: { in: targets.map((t) => t.id) } },
    data: { isActive: false, deletedAt: now },
  });

  await recordAuditLog({
    ctx: input.ctx,
    action: "update",
    entityType: "menu_template",
    entityId: 0n,
    after: { archivedIds: targets.map((t) => t.id.toString()) },
  });

  return { archived: targets.length };
}

export type MergeMenuTemplatesInput = {
  ctx: RequestContext;
  keepId: bigint;
  mergeIds: bigint[];
};

export async function mergeMenuTemplates(input: MergeMenuTemplatesInput) {
  const mergeIds = input.mergeIds.filter((id) => id !== input.keepId);
  if (mergeIds.length === 0) throw new ValidationError("統合対象を指定してください");

  const keep = await prisma.menuTemplate.findUnique({ where: { id: input.keepId } });
  if (!keep || keep.deletedAt) throw new NotFoundError("残す定型文が見つかりません");

  await prisma.$transaction(async (tx) => {
    await tx.platingInstruction.updateMany({
      where: { menuTemplateId: { in: mergeIds } },
      data: { menuTemplateId: input.keepId },
    });

    const merged = await tx.menuTemplate.findMany({ where: { id: { in: mergeIds } } });
    const extraUseCount = merged.reduce((sum, row) => sum + row.useCount, 0);

    await tx.menuTemplate.update({
      where: { id: input.keepId },
      data: { useCount: { increment: extraUseCount } },
    });

    await tx.menuTemplate.updateMany({
      where: { id: { in: mergeIds } },
      data: { isActive: false, deletedAt: new Date() },
    });
  });

  await recordAuditLog({
    ctx: input.ctx,
    action: "update",
    entityType: "menu_template",
    entityId: input.keepId,
    after: { mergedIds: mergeIds.map((id) => id.toString()) },
  });

  return { keepId: input.keepId.toString(), merged: mergeIds.length };
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}
