import { describe, expect, it } from "vitest";
import { applyCustomerScope } from "../src/lib/scope.js";
import type { RequestContext } from "../src/types/context.js";

describe("inquiry customer scope", () => {
  it("restricts facility users to their own customer", () => {
    const ctx: RequestContext = {
      sessionId: 1n,
      userType: "facility",
      customerId: 5n,
      customerUserId: 20n,
      name: "facility",
      roleCode: "facility_staff",
      permissions: new Set(["inquiry.read"]),
    };
    const where = applyCustomerScope({ status: "open" }, ctx);
    expect(where.customerId).toBe(5n);
    expect(where.status).toBe("open");
  });

  it("allows internal users to query across customers", () => {
    const ctx: RequestContext = {
      sessionId: 1n,
      userType: "internal",
      userId: 1n,
      name: "staff",
      roleCode: "internal_staff",
      permissions: new Set(["inquiry.read"]),
    };
    const where = applyCustomerScope({ status: "open" }, ctx);
    expect(where.customerId).toBeUndefined();
    expect(where.status).toBe("open");
  });
});
