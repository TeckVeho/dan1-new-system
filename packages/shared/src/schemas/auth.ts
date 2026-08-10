import { z } from "zod";

export const loginSchema = z.object({
  loginId: z.string().min(1),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
});

export const passwordResetRequestSchema = z.object({
  loginId: z.string().min(1),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(12),
});

export const impersonateSchema = z.object({
  customerId: z.string().min(1),
});

export const internalUserCreateSchema = z.object({
  employeeNo: z.string().min(1).max(20),
  haccpNo: z.string().max(20).optional(),
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  roleId: z.string().min(1),
  password: z.string().min(12).optional(),
  supplierIds: z.array(z.string()).optional(),
});

export const internalUserUpdateSchema = z.object({
  employeeNo: z.string().min(1).max(20).optional(),
  haccpNo: z.string().max(20).nullable().optional(),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().nullable().optional(),
  roleId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  supplierIds: z.array(z.string()).optional(),
});

export const facilityUserCreateSchema = z.object({
  customerId: z.string().min(1),
  loginId: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  roleId: z.string().min(1),
  password: z.string().min(12).optional(),
});

export const facilityUserUpdateSchema = z.object({
  loginId: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().nullable().optional(),
  roleId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const adminPasswordResetSchema = z.object({
  newPassword: z.string().min(12).optional(),
});

export const rolePermissionsUpdateSchema = z.object({
  permissionCodes: z.array(z.string()),
});
