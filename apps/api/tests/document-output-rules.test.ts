import { describe, expect, it } from "vitest";
import { resolveEffectiveDated } from "../src/services/settings.service.js";

describe("document output rules (settings integration)", () => {
  it("resolves customer diet type from effective-dated settings", () => {
    const records = [
      {
        validFrom: new Date("2024-01-01"),
        validTo: new Date("2024-06-30"),
        settings: { dietTypeCode: "normal" },
      },
      {
        validFrom: new Date("2024-07-01"),
        validTo: null,
        settings: { dietTypeCode: "no_soup" },
      },
    ];

    const june = resolveEffectiveDated(records, new Date("2024-06-15"));
    const july = resolveEffectiveDated(records, new Date("2024-07-15"));

    expect((june?.settings as { dietTypeCode: string }).dietTypeCode).toBe("normal");
    expect((july?.settings as { dietTypeCode: string }).dietTypeCode).toBe("no_soup");
  });
});
