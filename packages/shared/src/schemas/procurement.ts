import { z } from "zod";

export const scheduleQuerySchema = z.object({
  supplierId: z.string().min(1),
  deliveryFrom: z.string(),
  deliveryTo: z.string(),
  category: z.string().optional(),
  search: z.string().optional(),
  shortageOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(100),
});

export const scheduleExportSchema = scheduleQuerySchema.omit({ page: true, pageSize: true }).extend({
  format: z.enum(["xlsx", "csv"]).default("xlsx"),
});

export const orderScheduleUpdateSchema = z.object({
  id: z.string(),
  orderQty: z.coerce.number().min(0).optional(),
  actualStock: z.coerce.number().min(0).optional(),
  version: z.coerce.number().int().min(0),
});

export const mealCountSyncSchema = z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
});

export const importBatchSchema = z.object({
  supplierId: z.string(),
  fileType: z.enum([
    "menu_a",
    "menu_b",
    "menu_c",
    "cooking_sheet",
    "order_file",
    "cooking_file",
  ]),
  fileId: z.string().min(1),
  targetDateFrom: z.string().optional(),
  targetDateTo: z.string().optional(),
});

export const referenceRuleAssignSchema = z.object({
  customerIds: z.array(z.string()),
  referenceRuleId: z.string(),
  validFrom: z.string(),
});

export const stockRecordQuerySchema = z.object({
  stockItemId: z.string().optional(),
  recordDateFrom: z.string().optional(),
  recordDateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).default(50),
});

export const stockRecordCreateSchema = z.object({
  stockItemId: z.string().min(1),
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quantity: z.coerce.number().min(0),
  recordType: z.enum(["inventory", "adjustment"]).default("inventory"),
});

export const importCalendarQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  supplierId: z.string().optional(),
});

export const mealCountAdjustmentQuerySchema = z.object({
  customerId: z.string().optional(),
  serviceDateFrom: z.string().optional(),
  serviceDateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).default(50),
});

export const mealCountAdjustmentItemSchema = z.object({
  customerId: z.string().min(1),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealTypeId: z.string().min(1),
  adjustMeals: z.coerce.number().int(),
  reason: z.string().max(255).optional(),
  version: z.coerce.number().int().min(0).optional(),
});

export const mealCountAdjustmentBulkSchema = z.object({
  items: z.array(mealCountAdjustmentItemSchema).min(1).max(500),
});
