import { describe, it, expect } from "vitest";
import { mapReferences } from "./references";

describe("mapReferences", () => {
  it("extracts multiple labels from a single VFP record", () => {
    const results = mapReferences({
      CUSTNO: "GUIBE    ",
      REF_LABEL1: "PO#            ",
      REF_LABEL2: "Release#       ",
      REF_LABEL3: "               ",
      REF_LABEL4: "Tag#           ",
    });
    expect(results).toEqual([
      { custCode: "GUIBE", reference: "PO#" },
      { custCode: "GUIBE", reference: "Release#" },
      { custCode: "GUIBE", reference: "Tag#" },
    ]);
  });

  it("returns empty array for empty CUSTNO", () => {
    expect(
      mapReferences({ CUSTNO: "         ", REF_LABEL1: "Test" })
    ).toEqual([]);
  });

  it("returns empty array when all labels are empty", () => {
    expect(
      mapReferences({ CUSTNO: "GUIBE", REF_LABEL1: "   ", REF_LABEL2: "" })
    ).toEqual([]);
  });
});
