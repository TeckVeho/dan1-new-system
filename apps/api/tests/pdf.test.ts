import { describe, expect, it } from "vitest";
import { Prisma } from "@dan1/database";
import { buildInvoicePdfBuffer } from "../src/services/invoice-pdf.service.js";

describe("invoice PDF generation", () => {
  it("builds a PDF buffer starting with %PDF", async () => {
    const buffer = await buildInvoicePdfBuffer({
      invoiceMonth: "2026-08",
      version: 1,
      issuedAt: new Date("2026-08-10T00:00:00.000Z"),
      totalAmount: new Prisma.Decimal("5500.00"),
      taxRate: "10.00",
      customer: { customerCode: "C001", name: "テスト施設" },
      lines: [
        {
          lineNo: 1,
          description: "普通食",
          quantity: 10,
          unitPrice: new Prisma.Decimal("500.00"),
          amount: new Prisma.Decimal("5000.00"),
        },
      ],
    });

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("produces a larger PDF when more lines are included", async () => {
    const base = {
      invoiceMonth: "2026-08",
      version: 2,
      issuedAt: new Date("2026-08-10T00:00:00.000Z"),
      totalAmount: new Prisma.Decimal("1100.00"),
      taxRate: "10.00",
      customer: { customerCode: "C002", name: "Sample Facility" },
    };

    const oneLine = await buildInvoicePdfBuffer({
      ...base,
      lines: [
        {
          lineNo: 1,
          description: "Regular meal",
          quantity: 1,
          unitPrice: new Prisma.Decimal("500.00"),
          amount: new Prisma.Decimal("500.00"),
        },
      ],
    });

    const twoLines = await buildInvoicePdfBuffer({
      ...base,
      lines: [
        {
          lineNo: 1,
          description: "Regular meal",
          quantity: 1,
          unitPrice: new Prisma.Decimal("500.00"),
          amount: new Prisma.Decimal("500.00"),
        },
        {
          lineNo: 2,
          description: "Soft rice",
          quantity: 1,
          unitPrice: new Prisma.Decimal("500.00"),
          amount: new Prisma.Decimal("500.00"),
        },
      ],
    });

    expect(twoLines.length).toBeGreaterThan(oneLine.length);
  });
});
