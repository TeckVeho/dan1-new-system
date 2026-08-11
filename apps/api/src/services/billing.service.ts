import { prisma, Prisma } from "@dan1/database";
import type { InvoiceStatus } from "@dan1/database";
import { NotFoundError, ValidationError } from "../lib/errors.js";
import type { RequestContext } from "../types/context.js";
import { recordAuditLog } from "./audit.service.js";
import { resolveEffectiveDated } from "./settings.service.js";
import { createNotificationsForCustomerUsers } from "./notification.service.js";
import { createAndRunJob } from "./jobs.service.js";

function monthRange(invoiceMonth: string): { from: Date; to: Date } {
  const [year, month] = invoiceMonth.split("-").map(Number);
  const from = new Date(Date.UTC(year!, month! - 1, 1));
  const to = new Date(Date.UTC(year!, month!, 0));
  return { from, to };
}

async function enqueueInvoicePdfGeneration(invoiceId: bigint, createdBy?: bigint): Promise<void> {
  await createAndRunJob({
    jobType: "invoice.generate_pdf",
    params: { invoiceId: invoiceId.toString() },
    paramsHash: `invoice-pdf:${invoiceId}`,
    createdBy,
  });
}

export async function resolveUnitPrice(customerId: bigint, menuKindId: bigint, asOf: Date): Promise<Prisma.Decimal | null> {
  const records = await prisma.unitPrice.findMany({
    where: {
      menuKindId,
      OR: [{ customerId }, { customerId: null }],
    },
  });
  const customerSpecific = records.filter((r) => r.customerId === customerId);
  const resolved = resolveEffectiveDated(customerSpecific.length > 0 ? customerSpecific : records, asOf);
  return resolved?.price ?? null;
}

export async function resolveTaxRate(asOf: Date): Promise<Prisma.Decimal> {
  const records = await prisma.taxRate.findMany();
  const resolved = resolveEffectiveDated(records, asOf);
  return resolved?.rate ?? new Prisma.Decimal("10.00");
}

export type ListInvoicesQuery = {
  ctx: RequestContext;
  invoiceMonth?: string;
  customerId?: bigint;
  status?: InvoiceStatus;
  page: number;
  perPage: number;
};

export async function listInvoices(query: ListInvoicesQuery) {
  const where = {
    ...(query.invoiceMonth ? { invoiceMonth: query.invoiceMonth } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.ctx.userType === "facility" && query.ctx.customerId ? { customerId: query.ctx.customerId } : {}),
  };

  const [items, totalCount] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        customer: { select: { id: true, customerCode: true, name: true } },
        lines: { orderBy: { lineNo: "asc" } },
      },
      orderBy: [{ invoiceMonth: "desc" }, { customerId: "asc" }, { version: "desc" }],
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { items, totalCount };
}

export async function getInvoice(id: bigint, ctx: RequestContext) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, customerCode: true, name: true } },
      lines: { orderBy: { lineNo: "asc" } },
    },
  });
  if (!invoice) throw new NotFoundError("請求書が見つかりません");
  if (ctx.userType === "facility" && invoice.customerId !== ctx.customerId) {
    throw new NotFoundError("請求書が見つかりません");
  }
  return invoice;
}

export type CloseInvoicesInput = {
  ctx: RequestContext;
  invoiceMonth: string;
  customerIds?: bigint[];
};

export type InvoiceDraftLine = {
  lineNo: number;
  description: string;
  quantity: number;
  unitPrice: string;
  amount: string;
  lineType: string;
};

export type InvoiceDraftPreview = {
  customerId: string;
  customerCode: string;
  customerName: string;
  skipReason?: "existing_draft" | "no_orders" | "no_priced_lines";
  lines: InvoiceDraftLine[];
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  taxRate: string;
};

async function buildInvoiceDraft(
  customer: { id: bigint; customerCode: string; name: string },
  invoiceMonth: string,
  from: Date,
  to: Date,
  taxRate: Prisma.Decimal,
  existingDraftId?: bigint | null,
): Promise<InvoiceDraftPreview> {
  if (existingDraftId) {
    return {
      customerId: customer.id.toString(),
      customerCode: customer.customerCode,
      customerName: customer.name,
      skipReason: "existing_draft",
      lines: [],
      subtotal: "0",
      taxAmount: "0",
      totalAmount: "0",
      taxRate: taxRate.toString(),
    };
  }

  const orders = await prisma.mealOrder.groupBy({
    by: ["menuKindId"],
    where: {
      customerId: customer.id,
      serviceDate: { gte: from, lte: to },
      status: "confirmed",
    },
    _sum: { quantity: true },
  });

  if (orders.length === 0) {
    return {
      customerId: customer.id.toString(),
      customerCode: customer.customerCode,
      customerName: customer.name,
      skipReason: "no_orders",
      lines: [],
      subtotal: "0",
      taxAmount: "0",
      totalAmount: "0",
      taxRate: taxRate.toString(),
    };
  }

  const menuKinds = await prisma.menuKind.findMany({
    where: { id: { in: orders.map((o) => o.menuKindId) } },
  });
  const menuKindMap = new Map(menuKinds.map((m) => [m.id.toString(), m]));

  const lines: InvoiceDraftLine[] = [];
  let lineNo = 1;
  let subtotal = new Prisma.Decimal(0);

  for (const row of orders) {
    const qty = row._sum.quantity ?? 0;
    if (qty === 0) continue;
    const unitPrice = await resolveUnitPrice(customer.id, row.menuKindId, to);
    if (!unitPrice) continue;
    const menuKind = menuKindMap.get(row.menuKindId.toString());
    const amount = unitPrice.mul(qty);
    subtotal = subtotal.add(amount);
    lines.push({
      lineNo: lineNo++,
      description: menuKind?.name ?? "食事",
      quantity: qty,
      unitPrice: unitPrice.toString(),
      amount: amount.toString(),
      lineType: "meal",
    });
  }

  if (lines.length === 0) {
    return {
      customerId: customer.id.toString(),
      customerCode: customer.customerCode,
      customerName: customer.name,
      skipReason: "no_priced_lines",
      lines: [],
      subtotal: "0",
      taxAmount: "0",
      totalAmount: "0",
      taxRate: taxRate.toString(),
    };
  }

  const taxAmount = subtotal.mul(taxRate).div(100);
  const totalAmount = subtotal.add(taxAmount);

  return {
    customerId: customer.id.toString(),
    customerCode: customer.customerCode,
    customerName: customer.name,
    lines,
    subtotal: subtotal.toString(),
    taxAmount: taxAmount.toString(),
    totalAmount: totalAmount.toString(),
    taxRate: taxRate.toString(),
  };
}

export async function previewInvoices(input: CloseInvoicesInput) {
  const { from, to } = monthRange(input.invoiceMonth);
  const taxRate = await resolveTaxRate(to);

  const customers = input.customerIds?.length
    ? await prisma.customer.findMany({ where: { id: { in: input.customerIds }, isActive: true } })
    : await prisma.customer.findMany({ where: { isActive: true, isInternalTest: false } });

  const existingDrafts = await prisma.invoice.findMany({
    where: {
      invoiceMonth: input.invoiceMonth,
      status: "draft",
      customerId: { in: customers.map((c) => c.id) },
    },
    select: { customerId: true },
  });
  const draftCustomerIds = new Set(existingDrafts.map((d) => d.customerId.toString()));

  const previews: InvoiceDraftPreview[] = [];
  for (const customer of customers) {
    const preview = await buildInvoiceDraft(
      customer,
      input.invoiceMonth,
      from,
      to,
      taxRate,
      draftCustomerIds.has(customer.id.toString()) ? 1n : null,
    );
    previews.push(preview);
  }

  const creatable = previews.filter((p) => !p.skipReason);
  const skipped = previews.filter((p) => p.skipReason);

  return {
    invoiceMonth: input.invoiceMonth,
    taxRate: taxRate.toString(),
    period: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
    creatableCount: creatable.length,
    skippedCount: skipped.length,
    totalSubtotal: creatable.reduce((sum, p) => sum.add(p.subtotal), new Prisma.Decimal(0)).toString(),
    totalAmount: creatable.reduce((sum, p) => sum.add(p.totalAmount), new Prisma.Decimal(0)).toString(),
    items: previews,
  };
}

export async function closeInvoices(input: CloseInvoicesInput) {
  const { from, to } = monthRange(input.invoiceMonth);
  const taxRate = await resolveTaxRate(to);

  const customers = input.customerIds?.length
    ? await prisma.customer.findMany({ where: { id: { in: input.customerIds }, isActive: true } })
    : await prisma.customer.findMany({ where: { isActive: true, isInternalTest: false } });

  const created: bigint[] = [];

  for (const customer of customers) {
    const existingDraft = await prisma.invoice.findFirst({
      where: { customerId: customer.id, invoiceMonth: input.invoiceMonth, status: "draft" },
    });

    const draft = await buildInvoiceDraft(
      customer,
      input.invoiceMonth,
      from,
      to,
      taxRate,
      existingDraft?.id,
    );
    if (draft.skipReason || draft.lines.length === 0) continue;

    const invoice = await prisma.invoice.create({
      data: {
        customerId: customer.id,
        invoiceMonth: input.invoiceMonth,
        status: "draft",
        totalAmount: draft.totalAmount,
        settingsSnapshot: {
          taxRate: taxRate.toString(),
          generatedAt: new Date().toISOString(),
          period: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
        },
        lines: {
          create: draft.lines.map((line) => ({
            lineNo: line.lineNo,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            amount: line.amount,
            lineType: line.lineType,
          })),
        },
      },
    });
    created.push(invoice.id);

    await recordAuditLog({
      ctx: input.ctx,
      action: "create",
      entityType: "invoice",
      entityId: invoice.id,
      after: invoice,
    });
  }

  return { invoiceMonth: input.invoiceMonth, createdCount: created.length, invoiceIds: created };
}

export type IssueInvoiceInput = { ctx: RequestContext; invoiceId: bigint };

export async function issueInvoice(input: IssueInvoiceInput) {
  const invoice = await prisma.invoice.findUnique({ where: { id: input.invoiceId }, include: { lines: true } });
  if (!invoice) throw new NotFoundError("請求書が見つかりません");
  if (invoice.status !== "draft") {
    throw new ValidationError("下書き状態の請求書のみ発行できます");
  }

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: "issued", issuedAt: new Date() },
    include: { lines: true, customer: true },
  });

  await recordAuditLog({
    ctx: input.ctx,
    action: "update",
    entityType: "invoice",
    entityId: invoice.id,
    before: { status: invoice.status },
    after: { status: updated.status, issuedAt: updated.issuedAt },
  });

  await enqueueInvoicePdfGeneration(updated.id, input.ctx.userId);

  return updated;
}

export type CorrectInvoiceInput = {
  ctx: RequestContext;
  invoiceId: bigint;
  lines: Array<{ description: string; quantity: number; unitPrice: number; lineType: string }>;
  reason?: string;
};

export async function correctInvoice(input: CorrectInvoiceInput) {
  const original = await prisma.invoice.findUnique({
    where: { id: input.invoiceId },
    include: { lines: true },
  });
  if (!original) throw new NotFoundError("請求書が見つかりません");
  if (original.status !== "issued") {
    throw new ValidationError("発行済みの請求書のみ訂正できます");
  }

  const nextVersion = original.version + 1;
  const totalAmount = input.lines.reduce(
    (sum, line) => sum.add(new Prisma.Decimal(line.unitPrice).mul(line.quantity)),
    new Prisma.Decimal(0),
  );

  const corrected = await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: original.id },
      data: { status: "corrected" },
    });

    return tx.invoice.create({
      data: {
        customerId: original.customerId,
        invoiceMonth: original.invoiceMonth,
        status: "issued",
        version: nextVersion,
        totalAmount,
        issuedAt: new Date(),
        settingsSnapshot: {
          ...(typeof original.settingsSnapshot === "object" && original.settingsSnapshot
            ? (original.settingsSnapshot as Record<string, unknown>)
            : {}),
          correctedFromVersion: original.version,
          correctionReason: input.reason ?? null,
          correctedAt: new Date().toISOString(),
        },
        lines: {
          create: input.lines.map((line, index) => ({
            lineNo: index + 1,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            amount: new Prisma.Decimal(line.unitPrice).mul(line.quantity),
            lineType: line.lineType,
          })),
        },
      },
      include: { lines: true, customer: true },
    });
  });

  await createNotificationsForCustomerUsers(original.customerId, {
    title: "請求書が訂正されました",
    body: `${original.invoiceMonth} の請求書（訂正版 v${nextVersion}）をご確認ください。${input.reason ? `理由: ${input.reason}` : ""}`,
    category: "billing",
    linkUrl: `/invoices/${corrected.id}`,
  });

  await recordAuditLog({
    ctx: input.ctx,
    action: "update",
    entityType: "invoice",
    entityId: original.id,
    before: { status: original.status, version: original.version },
    after: { status: "corrected", newInvoiceId: corrected.id, version: nextVersion },
  });

  await enqueueInvoicePdfGeneration(corrected.id, input.ctx.userId);

  return corrected;
}

export type DeleteDraftInvoiceInput = { ctx: RequestContext; invoiceId: bigint };

export async function deleteDraftInvoice(input: DeleteDraftInvoiceInput) {
  const invoice = await prisma.invoice.findUnique({ where: { id: input.invoiceId } });
  if (!invoice) throw new NotFoundError("請求書が見つかりません");
  if (invoice.status !== "draft") {
    throw new ValidationError("下書き状態の請求書のみ削除できます");
  }

  await prisma.invoiceLine.deleteMany({ where: { invoiceId: invoice.id } });
  await prisma.invoice.delete({ where: { id: invoice.id } });

  await recordAuditLog({
    ctx: input.ctx,
    action: "delete",
    entityType: "invoice",
    entityId: invoice.id,
    before: invoice,
  });
}

function readSnapshotField(snapshot: unknown, key: string): unknown {
  if (!snapshot || typeof snapshot !== "object") return undefined;
  return (snapshot as Record<string, unknown>)[key];
}

export async function getInvoiceCorrections(invoiceId: bigint, ctx: RequestContext) {
  const invoice = await getInvoice(invoiceId, ctx);

  const versions = await prisma.invoice.findMany({
    where: {
      customerId: invoice.customerId,
      invoiceMonth: invoice.invoiceMonth,
    },
    include: {
      lines: { orderBy: { lineNo: "asc" } },
    },
    orderBy: { version: "asc" },
  });

  const items = versions.map((row) => ({
    id: row.id.toString(),
    version: row.version,
    status: row.status,
    totalAmount: row.totalAmount.toString(),
    issuedAt: row.issuedAt?.toISOString() ?? null,
    correctedFromVersion:
      typeof readSnapshotField(row.settingsSnapshot, "correctedFromVersion") === "number"
        ? (readSnapshotField(row.settingsSnapshot, "correctedFromVersion") as number)
        : null,
    correctionReason:
      typeof readSnapshotField(row.settingsSnapshot, "correctionReason") === "string"
        ? (readSnapshotField(row.settingsSnapshot, "correctionReason") as string)
        : null,
    correctedAt:
      typeof readSnapshotField(row.settingsSnapshot, "correctedAt") === "string"
        ? (readSnapshotField(row.settingsSnapshot, "correctedAt") as string)
        : null,
    lineCount: row.lines.length,
    lines: row.lines.map((line) => ({
      lineNo: line.lineNo,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice.toString(),
      amount: line.amount.toString(),
      lineType: line.lineType,
    })),
  }));

  return {
    invoiceId: invoice.id.toString(),
    customerId: invoice.customerId.toString(),
    invoiceMonth: invoice.invoiceMonth,
    currentVersion: invoice.version,
    items,
  };
}
