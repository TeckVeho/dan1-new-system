import ExcelJS from "exceljs";

export type SpreadsheetMerge = {
  top: number;
  left: number;
  bottom: number;
  right: number;
};

export type SpreadsheetSheet = {
  name: string;
  rows: (string | number | null | undefined)[][];
  columnWidths?: number[];
  merges?: SpreadsheetMerge[];
};

export function escapeCsvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function rowsToCsv(rows: unknown[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

/** 出力ファイル先頭に付ける条件メタ行（FR-006） */
export function buildExportMetaRows(
  meta: Record<string, string | number | boolean | null | undefined>,
): (string | number)[][] {
  const rows: (string | number)[][] = [["出力条件", ""]];
  for (const [label, value] of Object.entries(meta)) {
    if (value === undefined || value === null || value === "") continue;
    const display =
      typeof value === "boolean" ? (value ? "はい" : "いいえ") : String(value);
    rows.push([label, display]);
  }
  rows.push([]);
  return rows;
}

export async function buildWorkbookBuffer(sheets: SpreadsheetSheet[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name.slice(0, 31));
    for (const row of sheet.rows) {
      worksheet.addRow(row.map((cell) => cell ?? ""));
    }
    if (sheet.columnWidths?.length) {
      sheet.columnWidths.forEach((width, index) => {
        worksheet.getColumn(index + 1).width = width;
      });
    }
    for (const merge of sheet.merges ?? []) {
      worksheet.mergeCells(merge.top, merge.left, merge.bottom, merge.right);
    }
  }
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
