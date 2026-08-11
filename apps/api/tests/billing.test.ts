import { describe, expect, it } from "vitest";

function readSnapshotField(snapshot: unknown, key: string): unknown {
  if (!snapshot || typeof snapshot !== "object") return undefined;
  return (snapshot as Record<string, unknown>)[key];
}

describe("invoice correction history helpers", () => {
  it("reads correction metadata from settings snapshot", () => {
    const snapshot = {
      correctedFromVersion: 2,
      correctionReason: "数量訂正",
      correctedAt: "2026-08-11T00:00:00.000Z",
    };
    expect(readSnapshotField(snapshot, "correctedFromVersion")).toBe(2);
    expect(readSnapshotField(snapshot, "correctionReason")).toBe("数量訂正");
    expect(readSnapshotField(snapshot, "correctedAt")).toBe("2026-08-11T00:00:00.000Z");
  });

  it("returns undefined for invalid snapshot", () => {
    expect(readSnapshotField(null, "correctionReason")).toBeUndefined();
    expect(readSnapshotField("invalid", "correctionReason")).toBeUndefined();
  });
});

describe("invoice close preview skip reasons", () => {
  it("labels creatable vs skipped items", () => {
    const items = [
      { customerId: "1", skipReason: undefined, totalAmount: "1100" },
      { customerId: "2", skipReason: "existing_draft", totalAmount: "0" },
      { customerId: "3", skipReason: "no_orders", totalAmount: "0" },
    ];
    const creatable = items.filter((item) => !item.skipReason);
    const skipped = items.filter((item) => item.skipReason);
    expect(creatable).toHaveLength(1);
    expect(skipped).toHaveLength(2);
  });
});
