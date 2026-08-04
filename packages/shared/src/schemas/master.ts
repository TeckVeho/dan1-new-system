import { z } from "zod";

export const masterListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().optional(),
  includeInactive: z.coerce.boolean().optional(),
});

export const swallowCategorySchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(50),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean().default(true),
});

export const customerSchema = z.object({
  customerCode: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  nameKana: z.string().optional(),
  shortName: z.string().optional(),
  contractStartDate: z.string(),
  contractEndDate: z.string().optional(),
  isInternalTest: z.boolean().default(false),
});

export const customerSettingSchema = z.object({
  validFrom: z.string(),
  settings: z.record(z.unknown()),
  reason: z.string().optional(),
});

export const mealTypeSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(50),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const menuKindSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(50),
  swallowCategoryId: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const unitSchema = z.object({
  customerId: z.string().min(1),
  unitCode: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const supplierSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const stockItemSchema = z.object({
  supplierId: z.string().min(1),
  itemCode: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  category: z.string().optional(),
  unit: z.string().min(1).max(20),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const productionPatternSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  leadDays: z.number().int().min(0),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const announcementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  category: z.string().min(1).max(50),
  publishFrom: z.string(),
  publishTo: z.string().optional(),
  audience: z.enum(["all", "internal", "facility"]).default("all"),
  isActive: z.boolean().default(true),
});

export const referenceRuleSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  ruleConfig: z.record(z.unknown()),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
