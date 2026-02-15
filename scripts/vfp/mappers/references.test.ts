import { describe, it, expect } from "vitest";
import { mapReference } from "./references";

describe("mapReference", () => {
  it("maps VFP reference record with trimming", () => {
    const result = mapReference({
      custno: 101,
      reference: "PO-2024-001       ",
    });
    expect(result).toEqual({
      custNo: 101,
      reference: "PO-2024-001",
    });
  });

  it("returns null for empty reference", () => {
    expect(mapReference({ custno: 101, reference: "     " })).toBeNull();
  });
});
