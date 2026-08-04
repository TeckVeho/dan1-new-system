import { describe, expect, it } from "vitest";
import {
  resolveDeadlineFromCandidates,
  type DeadlineRuleCandidate,
  type DeadlineExceptionCandidate,
} from "../src/services/deadline.service.js";

function utc(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

const globalRule: DeadlineRuleCandidate = {
  id: 1n,
  scopeType: "global",
  scopeId: null,
  orderTypeId: null,
  dayOffset: 2,
  cutoffTime: "17:00",
  sortOrder: 1,
};

describe("resolveDeadlineFromCandidates", () => {
  it("computes a deadline dayOffset days before the service date at the cutoff time", () => {
    const resolved = resolveDeadlineFromCandidates([globalRule], [], { serviceDate: utc("2026-08-17") });
    expect(resolved).not.toBeNull();
    expect(resolved!.deadlineAt.toISOString()).toBe("2026-08-15T17:00:00.000Z");
    expect(resolved!.source).toBe("global");
    expect(resolved!.isException).toBe(false);
  });

  it("prefers a customer-scoped rule over the global rule", () => {
    const customerRule: DeadlineRuleCandidate = {
      id: 2n,
      scopeType: "customer",
      scopeId: 361n,
      orderTypeId: null,
      dayOffset: 1,
      cutoffTime: "12:00",
      sortOrder: 1,
    };
    const resolved = resolveDeadlineFromCandidates([globalRule, customerRule], [], {
      serviceDate: utc("2026-08-17"),
      customerId: 361n,
    });
    expect(resolved!.source).toBe("customer");
    expect(resolved!.ruleId).toBe(2n);
    expect(resolved!.deadlineAt.toISOString()).toBe("2026-08-16T12:00:00.000Z");
  });

  it("prefers a group-scoped rule over global but not over customer-scoped", () => {
    const groupRule: DeadlineRuleCandidate = {
      id: 3n,
      scopeType: "group",
      scopeId: 10n,
      orderTypeId: null,
      dayOffset: 3,
      cutoffTime: "09:00",
      sortOrder: 1,
    };
    const resolved = resolveDeadlineFromCandidates([globalRule, groupRule], [], {
      serviceDate: utc("2026-08-17"),
      customerGroupId: 10n,
    });
    expect(resolved!.source).toBe("group");
    expect(resolved!.ruleId).toBe(3n);
  });

  it("prefers an order-type-specific rule over a catch-all rule at the same scope", () => {
    const specificRule: DeadlineRuleCandidate = {
      id: 4n,
      scopeType: "global",
      scopeId: null,
      orderTypeId: 99n,
      dayOffset: 0,
      cutoffTime: "10:00",
      sortOrder: 1,
    };
    const resolved = resolveDeadlineFromCandidates([globalRule, specificRule], [], {
      serviceDate: utc("2026-08-17"),
      orderTypeId: 99n,
    });
    expect(resolved!.ruleId).toBe(4n);
  });

  it("uses an exception's own dayOffset/cutoffTime/reason when the service date matches", () => {
    const exception: DeadlineExceptionCandidate = {
      id: 1n,
      deadlineRuleId: 1n,
      serviceDate: utc("2027-01-01"),
      dayOffset: 12,
      cutoffTime: "10:00",
      reason: "正月前倒し",
    };
    const resolved = resolveDeadlineFromCandidates([globalRule], [exception], { serviceDate: utc("2027-01-01") });
    expect(resolved!.isException).toBe(true);
    expect(resolved!.exceptionReason).toBe("正月前倒し");
    expect(resolved!.deadlineAt.toISOString()).toBe("2026-12-20T10:00:00.000Z");
  });

  it("does not apply an exception tied to a different service date", () => {
    const exception: DeadlineExceptionCandidate = {
      id: 1n,
      deadlineRuleId: 1n,
      serviceDate: utc("2027-01-02"),
      dayOffset: 12,
      cutoffTime: "10:00",
      reason: "正月前倒し",
    };
    const resolved = resolveDeadlineFromCandidates([globalRule], [exception], { serviceDate: utc("2027-01-01") });
    expect(resolved!.isException).toBe(false);
    expect(resolved!.deadlineAt.toISOString()).toBe("2026-12-30T17:00:00.000Z");
  });

  it("rolls the deadline date back to the previous business day when it lands on a holiday", () => {
    const holidaySet = new Set(["2026-08-15", "2026-08-14"]);
    const resolved = resolveDeadlineFromCandidates([globalRule], [], { serviceDate: utc("2026-08-17") }, holidaySet);
    expect(resolved!.deadlineAt.toISOString()).toBe("2026-08-13T17:00:00.000Z");
  });

  it("returns null when no rule applies to the given scope", () => {
    const customerOnlyRule: DeadlineRuleCandidate = {
      id: 5n,
      scopeType: "customer",
      scopeId: 1n,
      orderTypeId: null,
      dayOffset: 1,
      cutoffTime: "17:00",
      sortOrder: 1,
    };
    const resolved = resolveDeadlineFromCandidates([customerOnlyRule], [], { serviceDate: utc("2026-08-17"), customerId: 2n });
    expect(resolved).toBeNull();
  });

  it("skips an order-type-specific rule when the request has no order type and falls back to the catch-all rule", () => {
    const specificRule: DeadlineRuleCandidate = {
      id: 6n,
      scopeType: "global",
      scopeId: null,
      orderTypeId: 99n,
      dayOffset: 0,
      cutoffTime: "10:00",
      sortOrder: 1,
    };
    const resolved = resolveDeadlineFromCandidates([globalRule, specificRule], [], { serviceDate: utc("2026-08-17") });
    expect(resolved!.ruleId).toBe(globalRule.id);
  });
});
