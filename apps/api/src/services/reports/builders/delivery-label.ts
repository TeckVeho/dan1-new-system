import { prisma } from "@dan1/database";
import { calculateDeliveryDates } from "../../../lib/delivery-date.js";
import { deliveryLabelReportParamsSchema } from "../params.js";
import {
  dateKey,
  parseDateParam,
  safeFilenamePart,
  toMultiSheetSpreadsheetFile,
} from "../helpers.js";
import type { ReportDefinition } from "../types.js";
import { PRODUCTION_PARAM_FIELDS } from "../params.js";
import { resolveCustomerProductionPattern } from "../../delivery-date.service.js";

const CARRIER_LABELS: Record<string, string> = {
  sagawa: "佐川急便",
  yamato: "ヤマト便",
};

function resolveParams(params: Record<string, unknown>) {
  const input = deliveryLabelReportParamsSchema.parse(params);
  return {
    serviceDateFrom: parseDateParam(input.serviceDateFrom),
    serviceDateTo: parseDateParam(input.serviceDateTo),
    customerId: input.customerId ? BigInt(input.customerId) : undefined,
    format: input.format,
    rangeLabel: `${input.serviceDateFrom}_${input.serviceDateTo}`,
  };
}

function dateRange(from: Date, to: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(from);
  while (cursor.getTime() <= to.getTime()) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

/** 配送ラベル（佐川/ヤマト別シート。仮フォーマット） */
export const deliveryLabelReport: ReportDefinition = {
  key: "delivery_label",
  name: "配送ラベル",
  description: "施設・ユニット別の配送情報を出力します。ヤマト便は別シート（仮フォーマット）",
  category: "delivery",
  formats: ["xlsx", "csv"],
  permission: "shipping.generate",
  specStatus: "provisional",
  paramsSchema: deliveryLabelReportParamsSchema,
  paramFields: PRODUCTION_PARAM_FIELDS,
  async build({ params, setProgress }) {
    const resolved = resolveParams(params);
    await setProgress(15, "施設情報を取得中");

    const holidays = await prisma.businessCalendar.findMany({
      where: {
        isHoliday: true,
        calDate: { gte: resolved.serviceDateFrom, lte: resolved.serviceDateTo },
      },
    });
    const holidaySet = new Set(holidays.map((h) => dateKey(h.calDate)));

    const customers = await prisma.customer.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(resolved.customerId ? { id: resolved.customerId } : {}),
      },
      include: {
        units: { where: { isActive: true, deletedAt: null }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { customerCode: "asc" },
    });

    const header = [
      "喫食日",
      "施設コード",
      "施設名",
      "ユニット",
      "郵便番号",
      "住所",
      "電話",
      "製造日",
      "集荷日",
      "着日",
      "配送業者",
    ];

    const sagawaRows: (string | number)[][] = [];
    const yamatoRows: (string | number)[][] = [];
    const dates = dateRange(resolved.serviceDateFrom, resolved.serviceDateTo);

    await setProgress(40, "配送日を計算中");
    for (const customer of customers) {
      for (const serviceDate of dates) {
        const pattern = await resolveCustomerProductionPattern(customer.id, serviceDate);
        if (!pattern) continue;

        const carrier = pattern.carrierCode ?? "sagawa";
        const datesCalc = calculateDeliveryDates(serviceDate, pattern, holidaySet);

        for (const unit of customer.units) {
          const row = [
            dateKey(serviceDate),
            customer.customerCode,
            customer.name,
            unit.name,
            customer.postalCode ?? "",
            customer.address ?? "",
            customer.phone ?? "",
            datesCalc.manufacturingDate,
            datesCalc.pickupDate,
            datesCalc.arrivalDate,
            CARRIER_LABELS[carrier] ?? carrier,
          ];
          if (carrier === "yamato") yamatoRows.push(row);
          else sagawaRows.push(row);
        }
      }
    }

    await setProgress(85, "ファイルを生成中");
    return toMultiSheetSpreadsheetFile({
      sheets: [
        { name: "佐川急便", header, rows: sagawaRows, columnWidths: [12, 12, 20, 10, 10, 30, 14, 12, 12, 12, 12] },
        { name: "ヤマト便", header, rows: yamatoRows, columnWidths: [12, 12, 20, 10, 10, 30, 14, 12, 12, 12, 12] },
      ],
      filenameBase: `配送ラベル_${safeFilenamePart(resolved.rangeLabel)}`,
      format: resolved.format,
    });
  },
};
