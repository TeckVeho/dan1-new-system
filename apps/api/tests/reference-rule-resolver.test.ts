import { describe, expect, it } from "vitest";
import {
  parseReferenceRuleConfig,
  resolveLookbackDays,
  resolveOrderWeekdays,
} from "../src/lib/reference-rule-resolver.js";

describe("reference rule resolver", () => {
  it("parses latest rice fallback config", () => {
    const config = parseReferenceRuleConfig({ type: "latest_rice_fallback", lookbackDays: 21 });
    expect(config.type).toBe("latest_rice_fallback");
    expect(resolveLookbackDays(config)).toBe(21);
  });

  it("parses order weekdays config", () => {
    const config = parseReferenceRuleConfig({ type: "order_weekdays", orderWeekdays: [1, 3, 5] });
    expect(resolveOrderWeekdays(config)).toEqual([1, 3, 5]);
  });

  it("returns defaults for invalid config", () => {
    expect(parseReferenceRuleConfig(null)).toEqual({});
    expect(resolveLookbackDays({})).toBe(14);
    expect(resolveOrderWeekdays({})).toBeNull();
  });
});
