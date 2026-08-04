import { describe, expect, it } from "vitest";
import { masterSortOrderSchema } from "@dan1/shared";

describe("masterSortOrderSchema", () => {
  it("accepts a non-empty items array", () => {
    const parsed = masterSortOrderSchema.parse({
      items: [
        { id: "1", sortOrder: 0 },
        { id: "2", sortOrder: 1 },
      ],
    });
    expect(parsed.items).toHaveLength(2);
  });

  it("rejects an empty items array", () => {
    expect(() => masterSortOrderSchema.parse({ items: [] })).toThrow();
  });
});
