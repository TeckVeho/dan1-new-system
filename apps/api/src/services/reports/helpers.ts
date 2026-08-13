import { prisma } from "@dan1/database";
import { buildWorkbookBuffer, rowsToCsv, buildExportMetaRows } from "../../lib/spreadsheet.js";
import type { BuiltReportFile, ReportFormat } from "./types.js";

export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateParam(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function safeFilenamePart(value: string): string {
  return value.replace(/[/\\?%*:|"<>]/g, "_");
}

export async function fetchMealOrdersForReport(params: {
  serviceDateFrom: Date;
  serviceDateTo: Date;
  customerId?: bigint;
}) {
  return prisma.mealOrder.findMany({
    where: {
      serviceDate: { gte: params.serviceDateFrom, lte: params.serviceDateTo },
      status: { in: ["provisional", "confirmed"] },
      ...(params.customerId ? { customerId: params.customerId } : {}),
    },
    include: {
      customer: { select: { id: true, customerCode: true, name: true } },
      unit: { select: { id: true, name: true, sortOrder: true } },
      mealType: { select: { id: true, code: true, name: true, sortOrder: true } },
      menuKind: { select: { id: true, code: true, name: true, sortOrder: true } },
      orderType: { select: { id: true, code: true, name: true } },
    },
    orderBy: [
      { serviceDate: "asc" },
      { customer: { customerCode: "asc" } },
      { unit: { sortOrder: "asc" } },
      { mealType: { sortOrder: "asc" } },
      { menuKind: { sortOrder: "asc" } },
    ],
  });
}

export async function fetchAllergenOrdersForReport(params: {
  serviceDateFrom: Date;
  serviceDateTo: Date;
  customerId?: bigint;
}) {
  return prisma.allergenOrder.findMany({
    where: {
      serviceDate: { gte: params.serviceDateFrom, lte: params.serviceDateTo },
      status: { in: ["provisional", "confirmed"] },
      ...(params.customerId ? { customerId: params.customerId } : {}),
    },
    include: {
      customer: { select: { customerCode: true, name: true } },
      unit: { select: { name: true, sortOrder: true } },
      allergenType: { select: { code: true, name: true } },
    },
    orderBy: [
      { serviceDate: "asc" },
      { customer: { customerCode: "asc" } },
      { unit: { sortOrder: "asc" } },
    ],
  });
}

export async function toSpreadsheetFile(input: {
  sheetName: string;
  header: (string | number)[];
  rows: (string | number)[][];
  filenameBase: string;
  format: ReportFormat;
  columnWidths?: number[];
  meta?: Record<string, string | number | boolean | null | undefined>;
}): Promise<BuiltReportFile> {
  const metaRows = input.meta ? buildExportMetaRows(input.meta) : [];
  const allRows = [...metaRows, input.header, ...input.rows];

  if (input.format === "csv") {
    const csv = rowsToCsv(allRows);
    return {
      buffer: Buffer.from(`\uFEFF${csv}`, "utf-8"),
      filename: `${input.filenameBase}.csv`,
      mimeType: "text/csv; charset=utf-8",
      rowCount: input.rows.length,
    };
  }

  const buffer = await buildWorkbookBuffer([
    {
      name: input.sheetName.slice(0, 31),
      rows: allRows,
      columnWidths: input.columnWidths,
    },
  ]);

  return {
    buffer,
    filename: `${input.filenameBase}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    rowCount: input.rows.length,
  };
}

export async function toMultiSheetSpreadsheetFile(input: {
  sheets: Array<{
    name: string;
    header: (string | number)[];
    rows: (string | number)[][];
    columnWidths?: number[];
    meta?: Record<string, string | number | boolean | null | undefined>;
  }>;
  filenameBase: string;
  format: ReportFormat;
}): Promise<BuiltReportFile> {
  if (input.format === "csv") {
    const first = input.sheets[0];
    if (!first) throw new Error("シートがありません");
    return toSpreadsheetFile({
      sheetName: first.name,
      header: first.header,
      rows: first.rows,
      filenameBase: input.filenameBase,
      format: "csv",
      meta: first.meta,
    });
  }

  const buffer = await buildWorkbookBuffer(
    input.sheets.map((sheet) => {
      const metaRows = sheet.meta ? buildExportMetaRows(sheet.meta) : [];
      return {
        name: sheet.name,
        rows: [...metaRows, sheet.header, ...sheet.rows],
        columnWidths: sheet.columnWidths,
      };
    }),
  );

  const rowCount = input.sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0);
  return {
    buffer,
    filename: `${input.filenameBase}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    rowCount,
  };
}
