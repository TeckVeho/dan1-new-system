import { describe, expect, it } from "vitest";
import { escapeCsvCell, rowsToCsv, buildWorkbookBuffer, buildExportMetaRows } from "../src/lib/spreadsheet.js";

describe("spreadsheet utilities", () => {
  it("escapes CSV cells with quotes and commas", () => {
    expect(escapeCsvCell('say "hello"')).toBe('"say ""hello"""');
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
  });

  it("builds CSV from rows", () => {
    const csv = rowsToCsv([
      ["商品", "数量"],
      ["米", 10],
    ]);
    expect(csv).toBe('"商品","数量"\n"米","10"');
  });

  it("builds export meta rows with boolean labels", () => {
    const rows = buildExportMetaRows({
      帳票名: "発注スケジュール",
      不足のみ: true,
      空項目: "",
    });
    expect(rows[0]).toEqual(["出力条件", ""]);
    expect(rows).toContainEqual(["帳票名", "発注スケジュール"]);
    expect(rows).toContainEqual(["不足のみ", "はい"]);
    expect(rows.at(-1)).toEqual([]);
  });

  it("builds an xlsx buffer", async () => {
    const buffer = await buildWorkbookBuffer([
      {
        name: "Sheet1",
        rows: [
          ["A", "B"],
          ["1", "2"],
        ],
      },
    ]);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
  });
});
