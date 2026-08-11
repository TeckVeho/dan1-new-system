import { describe, expect, it } from "vitest";
import { listReportDefinitions, getReportDefinition, resolveLegacyExportType } from "../src/services/reports/registry.js";

describe("report registry", () => {
  it("lists all registered reports", () => {
    const keys = listReportDefinitions().map((def) => def.key);
    expect(keys).toContain("procurement_schedule");
    expect(keys).toContain("orders_csv");
    expect(keys).toContain("meal_count_summary");
    expect(keys).toContain("meal_count_confirm");
    expect(keys).toContain("meal_count_sync");
    expect(keys).toContain("allergen_relation");
    expect(keys).toContain("monthly_meal_count");
    expect(keys).toContain("delivery_label");
    expect(keys).toContain("sales_price");
    expect(keys.length).toBeGreaterThanOrEqual(19);
  });

  it("resolves legacy export types", () => {
    expect(resolveLegacyExportType("procurement_schedule")).toBe("procurement_schedule");
    expect(resolveLegacyExportType("orders_csv")).toBe("orders_csv");
    expect(resolveLegacyExportType("unknown")).toBeUndefined();
  });

  it("marks production reports as provisional", () => {
    const productionKeys = [
      "meal_count_summary",
      "production_plan",
      "converted_cooking",
      "measure_sheet",
      "heating_record",
      "transcription",
      "allergen_relation",
    ];
    for (const key of productionKeys) {
      expect(getReportDefinition(key)?.specStatus).toBe("provisional");
    }
    expect(getReportDefinition("procurement_schedule")?.specStatus).toBe("confirmed");
  });
});
