import { prisma, Prisma } from "@dan1/database";
import { applyPdfFont, createPdfBuffer } from "../lib/pdf.js";
import { NotFoundError } from "../lib/errors.js";
import { saveGeneratedFile } from "./generated-file.service.js";
import { createDownloadUrl } from "./files.service.js";
import type { RequestContext } from "../types/context.js";
import { getInvoice } from "./billing.service.js";

export type InvoicePdfLine = {
  lineNo: number;
  description: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  amount: Prisma.Decimal;
};

export type InvoicePdfData = {
  invoiceMonth: string;
  version: number;
  issuedAt: Date | null;
  totalAmount: Prisma.Decimal;
  taxRate: string | null;
  customer: { customerCode: string; name: string };
  lines: InvoicePdfLine[];
};

function formatYen(value: Prisma.Decimal | number): string {
  const num = typeof value === "number" ? value : Number(value.toString());
  return `¥${num.toLocaleString("ja-JP")}`;
}

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return value.toISOString().slice(0, 10);
}

function readTaxRate(settingsSnapshot: unknown): string | null {
  if (!settingsSnapshot || typeof settingsSnapshot !== "object") return null;
  const taxRate = (settingsSnapshot as Record<string, unknown>).taxRate;
  return typeof taxRate === "string" ? taxRate : null;
}

export function buildInvoicePdfBuffer(data: InvoicePdfData): Promise<Buffer> {
  const subtotal = data.lines.reduce(
    (sum, line) => sum.add(line.amount),
    new Prisma.Decimal(0),
  );
  const taxRate = data.taxRate ? new Prisma.Decimal(data.taxRate) : null;
  const taxAmount = taxRate ? subtotal.mul(taxRate).div(100) : null;

  return createPdfBuffer((doc) => {
    applyPdfFont(doc);

    doc.fontSize(20).text("請求書", { align: "center" });
    doc.moveDown();

    doc.fontSize(11);
    doc.text(`請求月: ${data.invoiceMonth}`);
    doc.text(`版: v${data.version}`);
    doc.text(`発行日: ${formatDate(data.issuedAt)}`);
    doc.moveDown(0.5);

    doc.text(`請求先: ${data.customer.customerCode} ${data.customer.name}`);
    doc.moveDown();

    const tableTop = doc.y;
    const colX = [50, 80, 280, 340, 400, 480];
    const headers = ["行", "内容", "数量", "単価", "金額"];

    doc.fontSize(10);
    headers.forEach((header, index) => {
      doc.text(header, colX[index], tableTop, { width: (colX[index + 1] ?? 550) - colX[index] - 4 });
    });

    let rowY = tableTop + 18;
    for (const line of data.lines) {
      if (rowY > 720) {
        doc.addPage();
        applyPdfFont(doc);
        rowY = 50;
      }

      doc.text(String(line.lineNo), colX[0], rowY);
      doc.text(line.description, colX[1], rowY, { width: colX[2] - colX[1] - 4 });
      doc.text(String(line.quantity), colX[2], rowY);
      doc.text(formatYen(line.unitPrice), colX[3], rowY);
      doc.text(formatYen(line.amount), colX[4], rowY);
      rowY += 16;
    }

    doc.moveDown();
    const summaryY = Math.max(rowY + 12, doc.y + 12);
    doc.text(`小計: ${formatYen(subtotal)}`, 350, summaryY, { align: "right", width: 200 });
    if (taxAmount && taxRate) {
      doc.text(`消費税 (${taxRate.toString()}%): ${formatYen(taxAmount)}`, 350, summaryY + 16, {
        align: "right",
        width: 200,
      });
    }
    doc.fontSize(12).text(`合計: ${formatYen(data.totalAmount)}`, 350, summaryY + 36, {
      align: "right",
      width: 200,
    });
  });
}

export async function loadInvoicePdfData(invoiceId: bigint): Promise<InvoicePdfData> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: { select: { customerCode: true, name: true } },
      lines: { orderBy: { lineNo: "asc" } },
    },
  });
  if (!invoice) throw new NotFoundError("請求書が見つかりません");

  return {
    invoiceMonth: invoice.invoiceMonth,
    version: invoice.version,
    issuedAt: invoice.issuedAt,
    totalAmount: invoice.totalAmount,
    taxRate: readTaxRate(invoice.settingsSnapshot),
    customer: invoice.customer,
    lines: invoice.lines.map((line) => ({
      lineNo: line.lineNo,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      amount: line.amount,
    })),
  };
}

export async function generateAndAttachInvoicePdf(input: {
  invoiceId: bigint;
  createdBy?: bigint;
}) {
  const invoice = await prisma.invoice.findUnique({ where: { id: input.invoiceId } });
  if (!invoice) throw new NotFoundError("請求書が見つかりません");
  if (invoice.status !== "issued") {
    throw new NotFoundError("発行済み請求書のみ PDF を生成できます");
  }

  const data = await loadInvoicePdfData(input.invoiceId);
  const buffer = await buildInvoicePdfBuffer(data);
  const filename = `invoice_${invoice.invoiceMonth}_v${invoice.version}.pdf`;

  const file = await saveGeneratedFile({
    createdBy: input.createdBy ?? null,
    buffer,
    originalName: filename,
    mimeType: "application/pdf",
  });

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { pdfFileId: file.id },
  });

  return {
    invoiceId: invoice.id.toString(),
    fileId: file.id.toString(),
    filename,
    sizeBytes: buffer.length,
  };
}

export async function getInvoiceDownloadUrl(invoiceId: bigint, ctx: RequestContext) {
  const invoice = await getInvoice(invoiceId, ctx);
  if (!invoice.pdfFileId) {
    throw new NotFoundError("PDFはまだ生成されていません");
  }
  return createDownloadUrl(invoice.pdfFileId);
}
