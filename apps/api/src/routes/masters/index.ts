import { Router } from "express";
import { prisma } from "@dan1/database";
import {
  swallowCategorySchema,
  mealTypeSchema,
  menuKindSchema,
  customerSchema,
  unitSchema,
  supplierSchema,
  stockItemSchema,
  productionPatternSchema,
  referenceRuleSchema,
  deadlineRuleSchema,
  deadlineExceptionSchema,
  menuTemplateSchema,
  allergenTypeSchema,
  customerGroupSchema,
  businessCalendarSchema,
  orderSuspensionSchema,
  dietTypeSchema,
  documentOutputRuleSchema,
  orderTypeSchema,
  riceTypeSchema,
  longHolidaySchema,
  unitPriceSchema,
  taxRateSchema,
} from "@dan1/shared";
import { createMasterRouter } from "./crud-factory.js";
import { customerSettingsRouter } from "./settings.routes.js";
import { customerAllergensRouter } from "./customer-allergens.routes.js";
import { customerProductionPatternsRouter } from "./customer-production-patterns.routes.js";
import { bagDesignsRouter, pickingDestinationsRouter } from "./bag-designs.routes.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { sendData, sendNoContent } from "../../lib/response.js";
import { NotFoundError } from "../../lib/errors.js";
import { paramId } from "../../lib/http.js";
import { recordAuditLog } from "../../services/audit.service.js";

export const mastersRouter = Router();

mastersRouter.use(
  "/swallow-categories",
  createMasterRouter({
    entityType: "swallow_category",
    model: prisma.swallowCategory,
    createSchema: swallowCategorySchema,
    updateSchema: swallowCategorySchema.partial(),
    searchFields: ["name", "code"],
    writePermission: "master.swallow_category.update",
  }),
);

mastersRouter.use(
  "/meal-types",
  createMasterRouter({
    entityType: "meal_type",
    model: prisma.mealType,
    createSchema: mealTypeSchema,
    updateSchema: mealTypeSchema.partial(),
    searchFields: ["name", "code"],
  }),
);

mastersRouter.use(
  "/rice-types",
  createMasterRouter({
    entityType: "rice_type",
    model: prisma.riceType,
    createSchema: riceTypeSchema,
    updateSchema: riceTypeSchema.partial(),
    searchFields: ["name", "code"],
  }),
);

mastersRouter.use(
  "/menu-kinds",
  createMasterRouter({
    entityType: "menu_kind",
    model: prisma.menuKind,
    createSchema: menuKindSchema,
    updateSchema: menuKindSchema.partial(),
    searchFields: ["name", "code"],
    include: { swallowCategory: true },
    toCreateData: (input) => ({
      ...input,
      swallowCategoryId: input.swallowCategoryId ? BigInt(input.swallowCategoryId) : null,
    }),
    toUpdateData: (input) => ({
      ...input,
      ...(input.swallowCategoryId !== undefined
        ? { swallowCategoryId: input.swallowCategoryId ? BigInt(input.swallowCategoryId) : null }
        : {}),
    }),
  }),
);

mastersRouter.use(
  "/customers",
  createMasterRouter({
    entityType: "customer",
    model: prisma.customer,
    createSchema: customerSchema,
    updateSchema: customerSchema.partial(),
    searchFields: ["name", "nameKana", "customerCode", "shortName"],
    defaultSortField: "customerCode",
    writePermission: "master.customer.update",
    toCreateData: (input) => ({
      ...input,
      customerGroupId: input.customerGroupId ? BigInt(input.customerGroupId) : null,
      contractStartDate: new Date(input.contractStartDate),
      contractEndDate: input.contractEndDate ? new Date(input.contractEndDate) : null,
    }),
    toUpdateData: (input) => ({
      ...input,
      ...(input.customerGroupId !== undefined
        ? { customerGroupId: input.customerGroupId ? BigInt(input.customerGroupId) : null }
        : {}),
      ...(input.contractStartDate ? { contractStartDate: new Date(input.contractStartDate) } : {}),
      ...(input.contractEndDate !== undefined
        ? { contractEndDate: input.contractEndDate ? new Date(input.contractEndDate) : null }
        : {}),
    }),
  }),
);

mastersRouter.use(
  "/units",
  createMasterRouter({
    entityType: "unit",
    model: prisma.unit,
    createSchema: unitSchema,
    updateSchema: unitSchema.partial(),
    searchFields: ["name", "unitCode"],
    filterQuery: { customerId: "customerId" },
    toCreateData: (input) => ({ ...input, customerId: BigInt(input.customerId) }),
    toUpdateData: (input) => ({
      ...input,
      ...(input.customerId !== undefined ? { customerId: BigInt(input.customerId) } : {}),
    }),
  }),
);

mastersRouter.use(
  "/suppliers",
  createMasterRouter({
    entityType: "supplier",
    model: prisma.supplier,
    createSchema: supplierSchema,
    updateSchema: supplierSchema.partial(),
    searchFields: ["name", "code"],
  }),
);

mastersRouter.use(
  "/stock-items",
  createMasterRouter({
    entityType: "stock_item",
    model: prisma.stockItem,
    createSchema: stockItemSchema,
    updateSchema: stockItemSchema.partial(),
    searchFields: ["name", "itemCode", "category"],
    writePermission: "master.stock_item.update",
    include: { supplier: true },
    toCreateData: (input) => ({ ...input, supplierId: BigInt(input.supplierId) }),
    toUpdateData: (input) => ({
      ...input,
      ...(input.supplierId !== undefined ? { supplierId: BigInt(input.supplierId) } : {}),
    }),
  }),
);

mastersRouter.use(
  "/production-patterns",
  createMasterRouter({
    entityType: "production_pattern",
    model: prisma.productionPattern,
    createSchema: productionPatternSchema,
    updateSchema: productionPatternSchema.partial(),
    searchFields: ["name", "code"],
    writePermission: "master.production_pattern.update",
  }),
);

mastersRouter.use(
  "/reference-rules",
  createMasterRouter({
    entityType: "reference_rule",
    model: prisma.referenceRule,
    createSchema: referenceRuleSchema,
    updateSchema: referenceRuleSchema.partial(),
    searchFields: ["name", "code"],
    writePermission: "master.reference_rule.update",
    toCreateData: (input) => ({ ...input, ruleConfig: input.ruleConfig as never }),
    toUpdateData: (input) => ({ ...input, ...(input.ruleConfig ? { ruleConfig: input.ruleConfig as never } : {}) }),
  }),
);

mastersRouter.use(
  "/deadline-rules",
  createMasterRouter({
    entityType: "deadline_rule",
    model: prisma.deadlineRule,
    createSchema: deadlineRuleSchema,
    updateSchema: deadlineRuleSchema.partial(),
    searchFields: ["name"],
    softDelete: true,
    writePermission: "master.deadline.update",
    include: { exceptions: true },
    toCreateData: (input) => ({ ...input, scopeId: input.scopeId ? BigInt(input.scopeId) : null }),
    toUpdateData: (input) => ({
      ...input,
      ...(input.scopeId !== undefined ? { scopeId: input.scopeId ? BigInt(input.scopeId) : null } : {}),
    }),
  }),
);

mastersRouter.use(
  "/deadline-exceptions",
  createMasterRouter({
    entityType: "deadline_exception",
    model: prisma.deadlineException,
    createSchema: deadlineExceptionSchema,
    updateSchema: deadlineExceptionSchema.partial(),
    searchFields: ["reason"],
    defaultSortField: "serviceDate",
    softDelete: false,
    writePermission: "master.deadline.update",
    toCreateData: (input) => ({
      deadlineRuleId: BigInt(input.deadlineRuleId),
      serviceDate: new Date(input.serviceDate),
      dayOffset: input.dayOffset,
      cutoffTime: input.cutoffTime,
      reason: input.reason,
    }),
    toUpdateData: (input) => ({
      ...(input.deadlineRuleId !== undefined ? { deadlineRuleId: BigInt(input.deadlineRuleId) } : {}),
      ...(input.serviceDate ? { serviceDate: new Date(input.serviceDate) } : {}),
      ...(input.dayOffset !== undefined ? { dayOffset: input.dayOffset } : {}),
      ...(input.cutoffTime !== undefined ? { cutoffTime: input.cutoffTime } : {}),
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
    }),
  }),
);

mastersRouter.use(
  "/menu-templates",
  createMasterRouter({
    entityType: "menu_template",
    model: prisma.menuTemplate,
    createSchema: menuTemplateSchema,
    updateSchema: menuTemplateSchema.partial(),
    searchFields: ["title", "body"],
  }),
);

// FR-207: 献立定型文（現行 set-out-directions 相当）。menu_templates と同一データ。
mastersRouter.use(
  "/setout-directions",
  createMasterRouter({
    entityType: "setout_direction",
    model: prisma.menuTemplate,
    createSchema: menuTemplateSchema,
    updateSchema: menuTemplateSchema.partial(),
    searchFields: ["title", "body"],
    writePermission: "master.setout_direction.update",
  }),
);

// Deadline exceptions: nested under their parent rule (FR-205, docs §3.3).
mastersRouter.get(
  "/deadline-rules/:ruleId/exceptions",
  authenticate,
  authorize("master.read"),
  async (req, res, next) => {
    try {
      const items = await prisma.deadlineException.findMany({
        where: { deadlineRuleId: BigInt(paramId(req.params.ruleId)) },
        orderBy: { serviceDate: "asc" },
      });
      sendData(res, items);
    } catch (error) {
      next(error);
    }
  },
);

mastersRouter.post(
  "/deadline-rules/:ruleId/exceptions",
  authenticate,
  authorize("master.deadline.update"),
  async (req, res, next) => {
    try {
      const input = deadlineExceptionSchema.parse({ ...req.body, deadlineRuleId: paramId(req.params.ruleId) });
      const created = await prisma.deadlineException.create({
        data: {
          deadlineRuleId: BigInt(input.deadlineRuleId),
          serviceDate: new Date(input.serviceDate),
          dayOffset: input.dayOffset,
          cutoffTime: input.cutoffTime,
          reason: input.reason,
        },
      });
      await recordAuditLog({
        ctx: req.context!,
        action: "create",
        entityType: "deadline_exception",
        entityId: created.id,
        after: created,
      });
      sendData(res, created, 201);
    } catch (error) {
      next(error);
    }
  },
);

mastersRouter.delete(
  "/deadline-rules/:ruleId/exceptions/:id",
  authenticate,
  authorize("master.deadline.update"),
  async (req, res, next) => {
    try {
      const id = BigInt(paramId(req.params.id));
      const before = await prisma.deadlineException.findUnique({ where: { id } });
      if (!before) throw new NotFoundError();
      await prisma.deadlineException.delete({ where: { id } });
      await recordAuditLog({ ctx: req.context!, action: "delete", entityType: "deadline_exception", entityId: id, before });
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  },
);

mastersRouter.use("/customers/:customerId/settings", customerSettingsRouter);
mastersRouter.use("/customers/:customerId/allergens", customerAllergensRouter);
mastersRouter.use("/customers/:customerId/production-patterns", customerProductionPatternsRouter);

mastersRouter.use(
  "/allergens",
  createMasterRouter({
    entityType: "allergen_type",
    model: prisma.allergenType,
    createSchema: allergenTypeSchema,
    updateSchema: allergenTypeSchema.partial(),
    searchFields: ["name", "code"],
    writePermission: "master.allergen.update",
  }),
);

mastersRouter.use(
  "/customer-groups",
  createMasterRouter({
    entityType: "customer_group",
    model: prisma.customerGroup,
    createSchema: customerGroupSchema,
    updateSchema: customerGroupSchema.partial(),
    searchFields: ["name", "code"],
    writePermission: "master.customer.update",
  }),
);

mastersRouter.use(
  "/order-types",
  createMasterRouter({
    entityType: "order_type",
    model: prisma.orderType,
    createSchema: orderTypeSchema,
    updateSchema: orderTypeSchema.partial(),
    searchFields: ["name", "code"],
    writePermission: "master.customer.update",
  }),
);

mastersRouter.use(
  "/long-holidays",
  createMasterRouter({
    entityType: "long_holiday",
    model: prisma.longHoliday,
    createSchema: longHolidaySchema,
    updateSchema: longHolidaySchema.partial(),
    searchFields: ["name", "reason"],
    defaultSortField: "startDate",
    softDelete: false,
    writePermission: "master.long_holiday.update",
    filterQuery: { customerId: "customerId" },
    toCreateData: (input) => ({
      ...input,
      customerId: input.customerId ? BigInt(input.customerId) : null,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
    }),
    toUpdateData: (input) => ({
      ...input,
      ...(input.customerId !== undefined ? { customerId: input.customerId ? BigInt(input.customerId) : null } : {}),
      ...(input.startDate ? { startDate: new Date(input.startDate) } : {}),
      ...(input.endDate ? { endDate: new Date(input.endDate) } : {}),
    }),
  }),
);

mastersRouter.use(
  "/business-calendars",
  createMasterRouter({
    entityType: "business_calendar",
    model: prisma.businessCalendar,
    createSchema: businessCalendarSchema,
    updateSchema: businessCalendarSchema.partial(),
    searchFields: ["note"],
    defaultSortField: "calDate",
    softDelete: false,
    toCreateData: (input) => ({ ...input, calDate: new Date(input.calDate) }),
    toUpdateData: (input) => ({
      ...input,
      ...(input.calDate ? { calDate: new Date(input.calDate) } : {}),
    }),
  }),
);

mastersRouter.use(
  "/order-suspensions",
  createMasterRouter({
    entityType: "order_suspension",
    model: prisma.orderSuspension,
    createSchema: orderSuspensionSchema,
    updateSchema: orderSuspensionSchema.partial(),
    searchFields: ["reason"],
    defaultSortField: "startDate",
    softDelete: false,
    filterQuery: { customerId: "customerId" },
    toCreateData: (input) => ({
      ...input,
      customerId: BigInt(input.customerId),
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
    }),
    toUpdateData: (input) => ({
      ...input,
      ...(input.customerId !== undefined ? { customerId: BigInt(input.customerId) } : {}),
      ...(input.startDate ? { startDate: new Date(input.startDate) } : {}),
      ...(input.endDate !== undefined ? { endDate: input.endDate ? new Date(input.endDate) : null } : {}),
    }),
  }),
);

mastersRouter.use(
  "/diet-types",
  createMasterRouter({
    entityType: "diet_type",
    model: prisma.dietType,
    createSchema: dietTypeSchema,
    updateSchema: dietTypeSchema.partial(),
    searchFields: ["code", "name"],
    writePermission: "master.customer.update",
  }),
);

mastersRouter.use(
  "/document-output-rules",
  createMasterRouter({
    entityType: "document_output_rule",
    model: prisma.documentOutputRule,
    createSchema: documentOutputRuleSchema,
    updateSchema: documentOutputRuleSchema.partial(),
    searchFields: ["dietTypeCode", "documentType"],
    softDelete: false,
    writePermission: "master.customer.update",
    toCreateData: (input) => ({
      dietTypeCode: input.dietTypeCode,
      documentType: input.documentType,
      isEnabled: input.isEnabled,
      sortOrder: input.sortOrder,
      validFrom: input.validFrom ? new Date(input.validFrom) : new Date("2020-01-01"),
      validTo: input.validTo ? new Date(input.validTo) : null,
    }),
    toUpdateData: (input) => ({
      ...(input.dietTypeCode !== undefined ? { dietTypeCode: input.dietTypeCode } : {}),
      ...(input.documentType !== undefined ? { documentType: input.documentType } : {}),
      ...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.validFrom !== undefined ? { validFrom: new Date(input.validFrom) } : {}),
      ...(input.validTo !== undefined ? { validTo: input.validTo ? new Date(input.validTo) : null } : {}),
    }),
  }),
);

mastersRouter.use(
  "/unit-prices",
  createMasterRouter({
    entityType: "unit_price",
    model: prisma.unitPrice,
    createSchema: unitPriceSchema,
    updateSchema: unitPriceSchema.partial(),
    searchFields: [],
    softDelete: false,
    writePermission: "master.customer.update",
    filterQuery: { customerId: "customerId", menuKindId: "menuKindId" },
    include: { customer: true, menuKind: true },
    toCreateData: (input) => ({
      customerId: input.customerId ? BigInt(input.customerId) : null,
      menuKindId: BigInt(input.menuKindId),
      price: input.price,
      validFrom: new Date(input.validFrom),
      validTo: input.validTo ? new Date(input.validTo) : null,
    }),
    toUpdateData: (input) => ({
      ...(input.customerId !== undefined ? { customerId: input.customerId ? BigInt(input.customerId) : null } : {}),
      ...(input.menuKindId !== undefined ? { menuKindId: BigInt(input.menuKindId) } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.validFrom !== undefined ? { validFrom: new Date(input.validFrom) } : {}),
      ...(input.validTo !== undefined ? { validTo: input.validTo ? new Date(input.validTo) : null } : {}),
    }),
  }),
);

mastersRouter.use(
  "/tax-rates",
  createMasterRouter({
    entityType: "tax_rate",
    model: prisma.taxRate,
    createSchema: taxRateSchema,
    updateSchema: taxRateSchema.partial(),
    searchFields: [],
    softDelete: false,
    writePermission: "master.customer.update",
    toCreateData: (input) => ({
      rate: input.rate,
      validFrom: new Date(input.validFrom),
      validTo: input.validTo ? new Date(input.validTo) : null,
    }),
    toUpdateData: (input) => ({
      ...(input.rate !== undefined ? { rate: input.rate } : {}),
      ...(input.validFrom !== undefined ? { validFrom: new Date(input.validFrom) } : {}),
      ...(input.validTo !== undefined ? { validTo: input.validTo ? new Date(input.validTo) : null } : {}),
    }),
  }),
);

mastersRouter.use("/bag-designs", bagDesignsRouter);
mastersRouter.use("/picking-destinations", pickingDestinationsRouter);
