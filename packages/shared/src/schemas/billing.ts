import { z } from "zod";

export const unitPriceSchema = z.object({
  customerId: z.string().optional(),
  menuKindId: z.string().min(1),
  price: z.coerce.number().min(0),
  validFrom: z.string(),
  validTo: z.string().optional(),
});

export const taxRateSchema = z.object({
  rate: z.coerce.number().min(0).max(100),
  validFrom: z.string(),
  validTo: z.string().optional(),
});

export const invoiceCloseSchema = z.object({
  invoiceMonth: z.string().regex(/^\d{4}-\d{2}$/),
  customerIds: z.array(z.string()).optional(),
});

export const invoiceLineSchema = z.object({
  description: z.string().min(1).max(255),
  quantity: z.coerce.number().int().min(0),
  unitPrice: z.coerce.number().min(0),
  lineType: z.enum(["meal", "surcharge", "adjustment"]).default("meal"),
});

export const invoiceCorrectSchema = z.object({
  lines: z.array(invoiceLineSchema).min(1),
  reason: z.string().max(500).optional(),
});

export const deliveryDatePreviewSchema = z.object({
  customerId: z.string().min(1),
  serviceDate: z.string(),
});

export const salesPriceGenerateSchema = z.object({
  invoiceMonth: z.string().regex(/^\d{4}-\d{2}$/),
  customerIds: z.array(z.string()).optional(),
  format: z.enum(["xlsx", "csv"]).default("xlsx"),
});
