import { z } from "zod";

export const weeklyOrderQuerySchema = z.object({
  customerId: z.string().optional(),
  unitId: z.string().min(1),
  weekStart: z.string(),
});

export const mealOrderUpsertSchema = z.object({
  unitId: z.string(),
  serviceDate: z.string(),
  mealTypeId: z.string(),
  menuKindId: z.string(),
  orderTypeId: z.string(),
  quantity: z.number().int().min(0),
  version: z.number().int().min(0).nullable().optional(),
});

export type MealOrderUpsertInput = z.infer<typeof mealOrderUpsertSchema>;

export const bulkMealOrderSchema = z.object({
  orders: z.array(mealOrderUpsertSchema),
});

export const deadlineRuleSchema = z.object({
  name: z.string().min(1),
  scopeType: z.enum(["global", "group", "customer"]),
  scopeId: z.string().optional(),
  dayOffset: z.number().int(),
  cutoffTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const deadlineExceptionSchema = z.object({
  deadlineRuleId: z.string(),
  serviceDate: z.string(),
  dayOffset: z.number().int(),
  cutoffTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().optional(),
});
