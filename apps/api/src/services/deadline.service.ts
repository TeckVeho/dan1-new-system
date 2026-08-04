import { prisma } from "@dan1/database";

export type DeadlineRuleCandidate = {
  id: bigint;
  scopeType: string;
  scopeId: bigint | null;
  orderTypeId: bigint | null;
  dayOffset: number;
  cutoffTime: string;
  sortOrder: number;
};

export type DeadlineExceptionCandidate = {
  id: bigint;
  deadlineRuleId: bigint;
  serviceDate: Date;
  dayOffset: number;
  cutoffTime: string;
  reason: string | null;
};

export type ResolveDeadlineParams = {
  serviceDate: Date;
  customerId?: bigint;
  customerGroupId?: bigint;
  orderTypeId?: bigint;
};

export type ResolvedDeadline = {
  deadlineAt: Date;
  isException: boolean;
  exceptionReason?: string;
  source: "customer" | "group" | "global";
  ruleId: bigint;
};

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function scopeRank(rule: DeadlineRuleCandidate, params: ResolveDeadlineParams): number | null {
  if (rule.scopeType === "customer") {
    return rule.scopeId !== null && params.customerId !== undefined && rule.scopeId === params.customerId ? 0 : null;
  }
  if (rule.scopeType === "group") {
    return rule.scopeId !== null && params.customerGroupId !== undefined && rule.scopeId === params.customerGroupId
      ? 1
      : null;
  }
  if (rule.scopeType === "global") return 2;
  return null;
}

function pickBestRule(
  rules: DeadlineRuleCandidate[],
  params: ResolveDeadlineParams,
): { rule: DeadlineRuleCandidate; rank: number } | null {
  let best: { rule: DeadlineRuleCandidate; rank: number; specific: number } | null = null;
  for (const rule of rules) {
    if (rule.orderTypeId !== null && params.orderTypeId !== undefined && rule.orderTypeId !== params.orderTypeId) {
      continue;
    }
    if (rule.orderTypeId !== null && params.orderTypeId === undefined) continue;
    const rank = scopeRank(rule, params);
    if (rank === null) continue;
    const specific = rule.orderTypeId === null ? 1 : 0;
    if (
      !best ||
      rank < best.rank ||
      (rank === best.rank && specific < best.specific) ||
      (rank === best.rank && specific === best.specific && rule.sortOrder < best.rule.sortOrder)
    ) {
      best = { rule, rank, specific };
    }
  }
  return best ? { rule: best.rule, rank: best.rank } : null;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function combineDateAndTime(date: Date, hhmm: string): Date {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hours ?? 0, minutes ?? 0, 0, 0),
  );
}

function adjustForBusinessDay(date: Date, holidaySet: Set<string>): Date {
  let adjusted = date;
  while (holidaySet.has(dateKey(adjusted))) {
    adjusted = addDays(adjusted, -1);
  }
  return adjusted;
}

/**
 * Pure deadline resolution — see docs/06_master_management_spec.md §3.1.
 * Kept free of I/O so it can be unit tested without a database.
 */
export function resolveDeadlineFromCandidates(
  rules: DeadlineRuleCandidate[],
  exceptions: DeadlineExceptionCandidate[],
  params: ResolveDeadlineParams,
  holidaySet: Set<string> = new Set(),
): ResolvedDeadline | null {
  const best = pickBestRule(rules, params);
  if (!best) return null;

  const { rule, rank } = best;
  const source: ResolvedDeadline["source"] = rank === 0 ? "customer" : rank === 1 ? "group" : "global";

  const exception = exceptions.find(
    (e) => e.deadlineRuleId === rule.id && dateKey(e.serviceDate) === dateKey(params.serviceDate),
  );

  const dayOffset = exception?.dayOffset ?? rule.dayOffset;
  const cutoffTime = exception?.cutoffTime ?? rule.cutoffTime;

  const rawDeadlineDate = addDays(params.serviceDate, -dayOffset);
  const adjustedDate = adjustForBusinessDay(rawDeadlineDate, holidaySet);
  const deadlineAt = combineDateAndTime(adjustedDate, cutoffTime);

  return {
    deadlineAt,
    isException: Boolean(exception),
    exceptionReason: exception?.reason ?? undefined,
    source,
    ruleId: rule.id,
  };
}

export type ResolveDeadlineInput = {
  serviceDate: Date;
  customerId?: bigint;
  orderTypeCode?: string;
};

async function loadHolidaySet(from: Date, to: Date): Promise<Set<string>> {
  const holidays = await prisma.businessCalendar.findMany({
    where: { isHoliday: true, calDate: { gte: from, lte: to } },
    select: { calDate: true },
  });
  return new Set(holidays.map((h) => dateKey(h.calDate)));
}

export async function resolveDeadline(input: ResolveDeadlineInput): Promise<ResolvedDeadline | null> {
  const [customer, orderType] = await Promise.all([
    input.customerId ? prisma.customer.findUnique({ where: { id: input.customerId } }) : Promise.resolve(null),
    input.orderTypeCode ? prisma.orderType.findUnique({ where: { code: input.orderTypeCode } }) : Promise.resolve(null),
  ]);

  const rules = await prisma.deadlineRule.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      OR: [
        { scopeType: "global" },
        ...(customer ? [{ scopeType: "customer", scopeId: customer.id }] : []),
        ...(customer?.customerGroupId ? [{ scopeType: "group", scopeId: customer.customerGroupId }] : []),
      ],
    },
    include: { exceptions: true },
  });

  const exceptions = rules.flatMap((r) => r.exceptions);
  // Look back far enough to cross typical long-weekend runs.
  const lookback = addDays(input.serviceDate, -14);
  const holidaySet = await loadHolidaySet(lookback, input.serviceDate);

  return resolveDeadlineFromCandidates(
    rules,
    exceptions,
    {
      serviceDate: input.serviceDate,
      customerId: customer?.id,
      customerGroupId: customer?.customerGroupId ?? undefined,
      orderTypeId: orderType?.id,
    },
    holidaySet,
  );
}

export async function resolveDeadlinesForRange(
  dates: Date[],
  customerId: bigint | undefined,
  orderTypeCode: string | undefined,
): Promise<Map<string, ResolvedDeadline | null>> {
  const result = new Map<string, ResolvedDeadline | null>();
  for (const date of dates) {
    const resolved = await resolveDeadline({ serviceDate: date, customerId, orderTypeCode });
    result.set(dateKey(date), resolved);
  }
  return result;
}
