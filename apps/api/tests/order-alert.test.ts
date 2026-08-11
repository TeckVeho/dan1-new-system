import { describe, expect, it } from "vitest";
import { buildUnacceptableOrderAlerts } from "../src/services/order-alert.service.js";

describe("buildUnacceptableOrderAlerts", () => {
  const customers = [{ id: 1n, customerCode: "C001", name: "テスト施設" }];

  it("detects allergen-only orders", () => {
    const alerts = buildUnacceptableOrderAlerts({
      mealByKey: new Map(),
      allergenByKey: new Map([["1:2026-08-10", 3]]),
      riceByKey: new Map(),
      customers,
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.reasons).toContain("allergen_only");
  });

  it("ignores facilities with basic meal counts", () => {
    const alerts = buildUnacceptableOrderAlerts({
      mealByKey: new Map([["1:2026-08-10", 10]]),
      allergenByKey: new Map([["1:2026-08-10", 3]]),
      riceByKey: new Map(),
      customers,
    });
    expect(alerts).toHaveLength(0);
  });
});
