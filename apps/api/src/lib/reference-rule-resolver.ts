import { z } from "zod";

export type ReferenceRuleConfig = {
  type?: "latest_rice_fallback" | "order_weekdays";
  lookbackDays?: number;
  orderWeekdays?: number[];
};

const referenceRuleConfigSchema = z.object({
  type: z.enum(["latest_rice_fallback", "order_weekdays"]).optional(),
  lookbackDays: z.number().int().min(1).max(90).optional(),
  orderWeekdays: z.array(z.number().int().min(0).max(6)).optional(),
});

export function parseReferenceRuleConfig(ruleConfig: unknown): ReferenceRuleConfig {
  const parsed = referenceRuleConfigSchema.safeParse(ruleConfig);
  if (!parsed.success) return {};
  return parsed.data;
}

export function resolveOrderWeekdays(config: ReferenceRuleConfig): number[] | null {
  if (config.type === "order_weekdays" && config.orderWeekdays?.length) {
    return config.orderWeekdays;
  }
  return null;
}

export function resolveLookbackDays(config: ReferenceRuleConfig): number {
  return config.lookbackDays ?? 14;
}
