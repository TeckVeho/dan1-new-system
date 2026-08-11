import { z } from "zod";

export const reportFormatSchema = z.enum(["xlsx", "csv"]);

export const productionReportParamsSchema = z.object({
  serviceDateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceDateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customerId: z.string().optional(),
  format: reportFormatSchema.default("xlsx"),
});

export const procurementScheduleReportParamsSchema = z.object({
  supplierId: z.string().min(1),
  deliveryFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deliveryTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string().optional(),
  search: z.string().optional(),
  shortageOnly: z.coerce.boolean().optional(),
  format: reportFormatSchema.default("xlsx"),
});

export const ordersCsvReportParamsSchema = z.object({
  customerId: z.string().optional(),
  search: z.string().optional(),
  serviceDateFrom: z.string().optional(),
  serviceDateTo: z.string().optional(),
  unitId: z.string().optional(),
  mealTypeId: z.string().optional(),
  menuKindId: z.string().optional(),
  status: z.enum(["draft", "provisional", "confirmed"]).optional(),
  format: z.literal("csv").default("csv"),
});

export const mealCountSyncReportParamsSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: reportFormatSchema.default("csv"),
});

export type MealCountSyncReportParams = z.infer<typeof mealCountSyncReportParamsSchema>;
export type ProductionReportParams = z.infer<typeof productionReportParamsSchema>;
export type ProcurementScheduleReportParams = z.infer<typeof procurementScheduleReportParamsSchema>;
export type OrdersCsvReportParams = z.infer<typeof ordersCsvReportParamsSchema>;

export const deliveryLabelReportParamsSchema = z.object({
  serviceDateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceDateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customerId: z.string().optional(),
  format: reportFormatSchema.default("xlsx"),
});

export const monthlyMealCountReportParamsSchema = z.object({
  serviceDateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceDateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customerId: z.string().optional(),
  format: reportFormatSchema.default("xlsx"),
});

export const rawMaterialOrderReportParamsSchema = z.object({
  serviceDateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceDateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  supplierId: z.string().optional(),
  format: reportFormatSchema.default("xlsx"),
});

export const pouchSealReportParamsSchema = z.object({
  serviceDateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceDateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: reportFormatSchema.default("xlsx"),
});

export const p7PrintCsvReportParamsSchema = z.object({
  serviceDateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceDateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: z.literal("csv").default("csv"),
});

export const pickingInstructionReportParamsSchema = z.object({
  serviceDateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceDateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: reportFormatSchema.default("xlsx"),
});

export const bagDesignReportParamsSchema = z.object({
  customerId: z.string().optional(),
  format: reportFormatSchema.default("xlsx"),
});

export type DeliveryLabelReportParams = z.infer<typeof deliveryLabelReportParamsSchema>;
export type MonthlyMealCountReportParams = z.infer<typeof monthlyMealCountReportParamsSchema>;

export const salesPriceReportParamsSchema = z.object({
  invoiceMonth: z.string().regex(/^\d{4}-\d{2}$/),
  customerIds: z.array(z.string()).optional(),
  format: reportFormatSchema.default("xlsx"),
});
