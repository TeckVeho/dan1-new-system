import { prisma } from "@dan1/database";
import { systemSettingsSchema } from "@dan1/shared";
import type { z } from "zod";
import type { RequestContext } from "../types/context.js";
import { recordAuditLog } from "./audit.service.js";

export const SYSTEM_SETTINGS_KEY = "general";

export type SystemSettings = z.infer<typeof systemSettingsSchema>;

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  brandName: "dan1",
  supportEmail: "support@dan1.local",
  sessionTimeoutMinutes: 60,
  maintenanceMode: false,
};

export async function getSystemSettings(): Promise<SystemSettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: SYSTEM_SETTINGS_KEY } });
  if (!row) return DEFAULT_SYSTEM_SETTINGS;
  return systemSettingsSchema.parse(row.value);
}

export async function updateSystemSettings(
  ctx: RequestContext,
  value: SystemSettings,
): Promise<SystemSettings> {
  const parsed = systemSettingsSchema.parse(value);
  const before = await getSystemSettings();

  await prisma.systemSetting.upsert({
    where: { key: SYSTEM_SETTINGS_KEY },
    create: { key: SYSTEM_SETTINGS_KEY, value: parsed as never },
    update: { value: parsed as never },
  });

  await recordAuditLog({
    ctx,
    action: "update",
    entityType: "system_setting",
    entityId: SYSTEM_SETTINGS_KEY,
    before,
    after: parsed,
  });

  return parsed;
}
