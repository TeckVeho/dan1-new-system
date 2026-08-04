import { z } from "zod";

export const scheduleQuerySchema = z.object({
  supplierId: z.string().min(1),
  deliveryFrom: z.string(),
  deliveryTo: z.string(),
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(100),
});

export const orderScheduleUpdateSchema = z.object({
  id: z.string(),
  orderQuantity: z.number().min(0),
  stockQuantity: z.number().min(0).optional(),
  version: z.number().int().min(0),
});

export const mealCountSyncSchema = z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
});

export const importBatchSchema = z.object({
  supplierId: z.string(),
  fileType: z.enum(["menu_a", "menu_b", "menu_c"]),
});

export const referenceRuleAssignSchema = z.object({
  customerIds: z.array(z.string()),
  referenceRuleId: z.string(),
  validFrom: z.string(),
});
