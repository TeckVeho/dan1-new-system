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
  customerGroupId: z.string().optional(),
  postalCode: z.string().max(8).optional(),
  prefecture: z.string().max(10).optional(),
  address: z.string().max(255).optional(),
  phone: z.string().max(20).optional(),
  fax: z.string().max(20).optional(),
  contactName: z.string().max(100).optional(),
  contractStartDate: z.string(),
  contractEndDate: z.string().optional(),
  isInternalTest: z.boolean().default(false),
  isActive: z.boolean().default(true),
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

export const riceTypeSchema = z.object({
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
  pickupOffsetD0: z.number().int().min(0).default(0),
  pickupOffsetD1: z.number().int().min(0).default(1),
  pickupOffsetD2: z.number().int().min(0).default(2),
  pickupOffsetD3: z.number().int().min(0).default(3),
  arrivalOffsetD1: z.number().int().min(0).default(1),
  arrivalOffsetD2: z.number().int().min(0).default(2),
  arrivalOffsetD3: z.number().int().min(0).default(3),
  carrierCode: z.string().max(20).optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const announcementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  category: z.string().min(1).max(50),
  severity: z.enum(["info", "important"]).default("info"),
  isPinned: z.boolean().default(false),
  publishFrom: z.string(),
  publishTo: z.string().optional(),
  audience: z.enum(["all", "internal", "facility"]).default("all"),
  targetScopeType: z.enum(["all", "customer", "customer_group"]).default("all"),
  targetScopeId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const referenceRuleSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  ruleConfig: z.record(z.unknown()),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const systemSettingsSchema = z.object({
  brandName: z.string().min(1),
  supportEmail: z.string().email(),
  sessionTimeoutMinutes: z.number().int().min(5).max(1440),
  maintenanceMode: z.boolean(),
});

export const masterSortOrderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        sortOrder: z.number().int().min(0),
      }),
    )
    .min(1),
});

export const fileUploadUrlRequestSchema = z.object({
  originalName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
});

export const orderTypeSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(50),
  linksToProductionReports: z.boolean().default(true),
  linksToSales: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const allergenTypeSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(50),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const customerGroupSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const businessCalendarSchema = z.object({
  calDate: z.string(),
  isHoliday: z.boolean().default(false),
  note: z.string().max(100).optional(),
});

export const orderSuspensionSchema = z.object({
  customerId: z.string().min(1),
  startDate: z.string(),
  endDate: z.string().optional(),
  reason: z.string().max(255).optional(),
});

export const documentOutputRuleSchema = z.object({
  dietTypeCode: z.string().min(1).max(20),
  documentType: z.string().min(1).max(50),
  isEnabled: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
});

export const dietTypeSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(50),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const documentOutputPreviewSchema = z.object({
  customerId: z.string().min(1),
  asOf: z.string().optional(),
});

export const menuTemplateBulkArchiveSchema = z.object({
  ids: z.array(z.string().min(1)).optional(),
  unusedSinceDays: z.number().int().min(1).optional(),
});

export const menuTemplateMergeSchema = z.object({
  keepId: z.string().min(1),
  mergeIds: z.array(z.string().min(1)).min(1),
});

export const customerAllergenSchema = z.object({
  allergenTypeId: z.string().min(1),
});

export const longHolidaySchema = z.object({
  customerId: z.string().optional(),
  name: z.string().max(100).optional(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().max(255).optional(),
});

export const customerProductionPatternSchema = z.object({
  productionPatternId: z.string().min(1),
  validFrom: z.string(),
  validTo: z.string().optional(),
});

export const documentOutputOverridesSchema = z.record(z.boolean());

export const customerSettingsPayloadSchema = z.object({
  dietTypeCode: z.string().optional(),
  documentOutputOverrides: documentOutputOverridesSchema.optional(),
});

export const fileRegisterSchema = z.object({
  storageKey: z.string().min(1).max(500),
  originalName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive(),
});
