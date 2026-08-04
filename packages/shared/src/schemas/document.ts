import { z } from "zod";

export const documentCreateSchema = z.object({
  customerId: z.string().optional(),
  documentType: z.string().min(1),
  title: z.string().min(1),
  serviceMonth: z.string().regex(/^\d{4}-\d{2}$/),
});

export const menuTemplateSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  tags: z.array(z.string()).optional(),
  sortOrder: z.number().int().default(0),
});

export const platingInstructionSchema = z.object({
  serviceDate: z.string(),
  menuTemplateId: z.string().optional(),
  body: z.string().min(1),
});
