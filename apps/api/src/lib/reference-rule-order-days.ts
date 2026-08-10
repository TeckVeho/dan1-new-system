/** Reference rule codes that restrict which weekdays require orders. */
const WEEKDAY_RULE_CODES: Record<string, number[]> = {
  mon_tue_thu_sat: [1, 2, 4, 6],
};

export function isOrderDayForReferenceRuleCode(ruleCode: string | null | undefined, date: Date): boolean {
  if (!ruleCode) return true;
  const weekdays = WEEKDAY_RULE_CODES[ruleCode];
  if (!weekdays) return true;
  return weekdays.includes(date.getUTCDay());
}

export function getActiveReferenceRuleCode(
  rules: Array<{
    validFrom: Date;
    validTo: Date | null;
    referenceRule: { code: string };
  }>,
  date: Date,
): string | null {
  const active = rules.find(
    (r) =>
      r.validFrom.getTime() <= date.getTime() &&
      (r.validTo === null || r.validTo.getTime() >= date.getTime()),
  );
  return active?.referenceRule.code ?? null;
}
