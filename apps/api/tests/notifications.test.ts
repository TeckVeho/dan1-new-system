import { describe, expect, it } from "vitest";
import type { RequestContext } from "../src/types/context.js";

// buildRecipientWhere のロジックをミラーしたユニットテスト
function isNotificationOwner(
  ctx: RequestContext,
  notification: { userId: bigint | null; customerUserId: bigint | null },
): boolean {
  if (ctx.userType === "internal") {
    return notification.userId === ctx.userId;
  }
  return notification.customerUserId === ctx.customerUserId;
}

describe("notification ownership", () => {
  it("allows internal users to read only their own notifications", () => {
    const ctx: RequestContext = {
      sessionId: 1n,
      userType: "internal",
      userId: 10n,
      name: "test",
      roleCode: "internal_staff",
      permissions: new Set(["order.read"]),
    };
    expect(isNotificationOwner(ctx, { userId: 10n, customerUserId: null })).toBe(true);
    expect(isNotificationOwner(ctx, { userId: 99n, customerUserId: null })).toBe(false);
  });

  it("allows facility users to read only their own notifications", () => {
    const ctx: RequestContext = {
      sessionId: 1n,
      userType: "facility",
      customerUserId: 20n,
      customerId: 5n,
      name: "facility user",
      roleCode: "facility_staff",
      permissions: new Set(["order.read"]),
    };
    expect(isNotificationOwner(ctx, { userId: null, customerUserId: 20n })).toBe(true);
    expect(isNotificationOwner(ctx, { userId: null, customerUserId: 99n })).toBe(false);
  });
});
