import { describe, expect, it } from "vitest";
import { normalizeImportFileType } from "../src/services/procurement.service.js";

describe("normalizeImportFileType", () => {
  it("maps legacy web labels to menu file types", () => {
    expect(normalizeImportFileType("cooking_sheet")).toBe("menu_a");
    expect(normalizeImportFileType("order_file")).toBe("menu_b");
    expect(normalizeImportFileType("cooking_file")).toBe("menu_c");
  });

  it("passes through canonical values", () => {
    expect(normalizeImportFileType("menu_a")).toBe("menu_a");
  });
});
