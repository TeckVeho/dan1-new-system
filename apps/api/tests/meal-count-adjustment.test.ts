import { describe, expect, it } from "vitest";
import { resolveOptionalScopedCustomerId } from "../src/lib/scope.js";
import type { RequestContext } from "../src/types/context.js";

describe("meal count adjustment scope", () => {
  it("forces facility scope when querying adjustments", () => {
    const ctx: RequestContext = {
      sessionId: 1n,
      userType: "facility",
      customerId: 9n,
      customerUserId: 1n,
      name: "facility",
      roleCode: "facility_admin",
      permissions: new Set(["procurement.adjustment.update"]),
    };
    expect(resolveOptionalScopedCustomerId(ctx, "9")).toBe(9n);
  });

  it("allows internal users to omit customerId for cross-facility listing", () => {
    const ctx: RequestContext = {
      sessionId: 1n,
      userType: "internal",
      userId: 2n,
      name: "staff",
      roleCode: "internal_staff",
      permissions: new Set(["procurement.adjustment.update"]),
    };
    expect(resolveOptionalScopedCustomerId(ctx, undefined)).toBeUndefined();
    expect(resolveOptionalScopedCustomerId(ctx, "12")).toBe(12n);
  });
});
