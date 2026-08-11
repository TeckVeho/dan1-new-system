import { prisma, Prisma } from "@dan1/database";
import type { RequestContext } from "../types/context.js";
import { resolveUnitPrice, resolveTaxRate } from "./billing.service.js";
import { buildWorkbookBuffer, rowsToCsv } from "../lib/spreadsheet.js";

function monthRange(invoiceMonth: string): { from: Date; to: Date } {
  const [year, month] = invoiceMonth.split("-").map(Number);
  const from = new Date(Date.UTC(year!, month! - 1, 1));
  const to = new Date(Date.UTC(year!, month!, 0));
  return { from, to };
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export type SalesPriceGenerateInput = {
  invoiceMonth: string;
  customerIds?: bigint[];
  format: "xlsx" | "csv";
};

export async function buildSalesPriceRows(invoiceMonth: string, customerIds?: bigint[]) {
  const { from, to } = monthRange(invoiceMonth);
  const taxRate = await resolveTaxRate(to);

  const customers = await prisma.customer.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      ...(customerIds?.length ? { id: { in: customerIds } } : {}),
      contractStartDate: { lte: to },
      OR: [{ contractEndDate: null }, { contractEndDate: { gte: from } }],
    },
    select: { id: true, customerCode: true, name: true },
    orderBy: { customerCode: "asc" },
  });

  const menuKinds = await prisma.menuKind.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { sortOrder: "asc" },
  });

  const rows: (string | number)[][] = [];
  for (const customer of customers) {
    const orders = await prisma.mealOrder.groupBy({
      by: ["menuKindId"],
      where: {
        customerId: customer.id,
        serviceDate: { gte: from, lte: to },
        status: "confirmed",
      },
      _sum: { quantity: true },
    });

    for (const agg of orders) {
      const menuKind = menuKinds.find((m) => m.id === agg.menuKindId);
      if (!menuKind) continue;
      const qty = agg._sum.quantity ?? 0;
      if (qty <= 0) continue;

      const unitPrice = await resolveUnitPrice(customer.id, agg.menuKindId, to);
      if (!unitPrice) continue;

      const subtotal = unitPrice.mul(qty);
      const tax = subtotal.mul(taxRate).div(100);
      const total = subtotal.add(tax);

      rows.push([
        invoiceMonth,
        customer.customerCode,
        customer.name,
        menuKind.code,
        menuKind.name,
        qty,
        unitPrice.toString(),
        taxRate.toString(),
        subtotal.toFixed(2),
        tax.toFixed(2),
        total.toFixed(2),
      ]);
    }
  }

  return rows;
}

export async function generateSalesPriceSpreadsheet(input: SalesPriceGenerateInput) {
  const rows = await buildSalesPriceRows(input.invoiceMonth, input.customerIds);
  const header = [
    "対象月",
    "施設コード",
    "施設名",
    "献立種類コード",
    "献立種類",
    "食数",
    "単価",
    "税率(%)",
    "税抜小計",
    "税額",
    "税込合計",
  ];
  const filenameBase = `売価_${input.invoiceMonth}`;

  if (input.format === "csv") {
    const csv = rowsToCsv([header, ...rows]);
    return {
      buffer: Buffer.from(`\uFEFF${csv}`, "utf-8"),
      filename: `${filenameBase}.csv`,
      mimeType: "text/csv; charset=utf-8",
      rowCount: rows.length,
    };
  }

  const buffer = await buildWorkbookBuffer([
    {
      name: "売価",
      rows: [header, ...rows],
      columnWidths: [10, 12, 24, 14, 20, 8, 10, 8, 12, 10, 12],
    },
  ]);

  return {
    buffer,
    filename: `${filenameBase}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    rowCount: rows.length,
  };
}

export type SalesPriceJobInput = SalesPriceGenerateInput & { ctx: RequestContext };

export async function enqueueSalesPriceJob(input: SalesPriceJobInput) {
  const { generateReportJob } = await import("./reports/report.service.js");
  return generateReportJob({
    ctx: input.ctx,
    reportKey: "sales_price",
    params: {
      invoiceMonth: input.invoiceMonth,
      customerIds: input.customerIds?.map(String),
      format: input.format,
    },
  });
}
