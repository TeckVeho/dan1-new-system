import { z } from "zod";

export const inquiryThreadStatusSchema = z.enum(["open", "closed"]);

export const inquiryThreadQuerySchema = z.object({
  customerId: z.string().optional(),
  status: inquiryThreadStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export const inquiryThreadCreateSchema = z.object({
  customerId: z.string().optional(),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(5000),
});

export const inquiryMessageCreateSchema = z.object({
  body: z.string().min(1).max(5000),
});

export const inquiryThreadStatusUpdateSchema = z.object({
  status: inquiryThreadStatusSchema,
});

export type InquiryThreadStatus = z.infer<typeof inquiryThreadStatusSchema>;
