import { z } from "zod";

export const loginSchema = z.object({
  loginId: z.string().min(1),
  password: z.string().min(1),
  loginType: z.enum(["employee", "haccp", "facility"]).default("employee"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const impersonateSchema = z.object({
  customerId: z.string().min(1),
});
