import { prisma } from "@dan1/database";
import { ValidPeriodOverlapError } from "../lib/errors.js";
import type { RequestContext } from "../types/context.js";
import { recordAuditLog } from "./audit.service.js";

export type EffectiveDated = {
  validFrom: Date;
  validTo: Date | null;
};

/**
 * Pure resolver for effective-dated (time-sliced) settings rows.
 * docs/08_api_spec.md §4.5 — callers MUST pass the business date
 * (service date / delivery date / billing date), never `new Date()`,
 * so past documents keep referencing the settings that were active
 * when they were generated (REQ-16).
 */
export function resolveEffectiveDated<T extends EffectiveDated>(records: T[], asOf: Date): T | null {
  const candidates = records.filter(
    (r) => r.validFrom.getTime() <= asOf.getTime() && (r.validTo === null || r.validTo.getTime() >= asOf.getTime()),
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((latest, current) => (current.validFrom > latest.validFrom ? current : latest));
}

export async function resolveCustomerSetting(customerId: bigint, asOf: Date) {
  const records = await prisma.customerSetting.findMany({ where: { customerId } });
  return resolveEffectiveDated(records, asOf);
}

export async function getCustomerSettingHistory(customerId: bigint) {
  return prisma.customerSetting.findMany({
    where: { customerId },
    orderBy: { validFrom: "asc" },
  });
}

export type UpdateCustomerSettingInput = {
  ctx: RequestContext;
  customerId: bigint;
  value: Record<string, unknown>;
  validFrom: Date;
  reason?: string;
};

export async function updateCustomerSetting(input: UpdateCustomerSettingInput) {
  const { ctx, customerId, value, validFrom } = input;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.customerSetting.findMany({ where: { customerId }, orderBy: { validFrom: "desc" } });
    const latest = existing[0];

    if (latest && validFrom.getTime() <= latest.validFrom.getTime()) {
      throw new ValidPeriodOverlapError("指定した適用開始日は既存の設定期間と重複しています", [
        {
          field: "validFrom",
          meta: { latestValidFrom: latest.validFrom.toISOString() },
          message: `既存設定の適用開始日（${latest.validFrom.toISOString().slice(0, 10)}）以降を指定してください`,
        },
      ]);
    }

    if (latest && latest.validTo === null) {
      const validTo = new Date(validFrom);
      validTo.setDate(validTo.getDate() - 1);
      await tx.customerSetting.update({ where: { id: latest.id }, data: { validTo, updatedBy: ctx.userId ?? null } });
    }

    const created = await tx.customerSetting.create({
      data: {
        customerId,
        validFrom,
        validTo: null,
        settings: value as never,
        createdBy: ctx.userId ?? null,
        updatedBy: ctx.userId ?? null,
      },
    });

    await recordAuditLog({
      ctx,
      action: "update",
      entityType: "customer_setting",
      entityId: customerId,
      before: latest ? { validFrom: latest.validFrom, settings: latest.settings } : null,
      after: { validFrom: created.validFrom, settings: created.settings, reason: input.reason },
    });

    return created;
  });
}
