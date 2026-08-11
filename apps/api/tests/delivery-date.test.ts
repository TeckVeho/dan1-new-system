import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  adjustBackwardToBusinessDay,
  adjustForwardToBusinessDay,
  calculateDeliveryDates,
} from "../src/lib/delivery-date.js";

describe("delivery date calculation", () => {
  const pattern = {
    leadDays: 2,
    pickupOffsetD0: 0,
    pickupOffsetD1: 1,
    pickupOffsetD2: 2,
    pickupOffsetD3: 3,
    arrivalOffsetD1: 1,
    arrivalOffsetD2: 2,
    arrivalOffsetD3: 3,
  };

  it("adds calendar days in UTC", () => {
    const base = new Date("2026-08-10T00:00:00.000Z");
    expect(addCalendarDays(base, 3).toISOString().slice(0, 10)).toBe("2026-08-13");
  });

  it("adjusts backward to business day", () => {
    const holidays = new Set(["2026-08-09", "2026-08-10"]);
    const date = new Date("2026-08-10T00:00:00.000Z");
    expect(adjustBackwardToBusinessDay(date, holidays).toISOString().slice(0, 10)).toBe("2026-08-08");
  });

  it("adjusts forward to business day", () => {
    const holidays = new Set(["2026-08-10", "2026-08-11"]);
    const date = new Date("2026-08-10T00:00:00.000Z");
    expect(adjustForwardToBusinessDay(date, holidays).toISOString().slice(0, 10)).toBe("2026-08-12");
  });

  it("calculates manufacturing, pickup and arrival dates", () => {
    const serviceDate = new Date("2026-08-15T00:00:00.000Z");
    const result = calculateDeliveryDates(serviceDate, pattern);
    expect(result.serviceDate).toBe("2026-08-15");
    expect(result.manufacturingDate).toBe("2026-08-13");
    expect(result.pickupDate).toBe("2026-08-13");
    expect(result.arrivalDate).toBe("2026-08-14");
    expect(result.warnings).toHaveLength(0);
  });

  it("warns when arrival exceeds service date", () => {
    const serviceDate = new Date("2026-08-12T00:00:00.000Z");
    const result = calculateDeliveryDates(serviceDate, { ...pattern, leadDays: 0, arrivalOffsetD1: 5 });
    expect(result.warnings.some((w) => w.includes("着日が喫食日を超えています"))).toBe(true);
  });
});
