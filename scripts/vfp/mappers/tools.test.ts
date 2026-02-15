import { describe, it, expect } from "vitest";
import { mapTool, mapToolPart } from "./tools";

describe("mapTool", () => {
  it("maps VFP tool record with uppercase fields", () => {
    const result = mapTool({
      TOOLNO: 42,
      CUSTNO: "GUIBE    ",
      TOOLNAME: "3-inch Mandrel                     ",
      NOMINAL: "3 inch              ",
      LONGEST: 24,
      PIECES: 4,
      PRICE1: 1250.0,
      PRICE2: 1500.0,
      ACTIVE: true,
    });
    expect(result).toEqual({
      toolNo: 42,
      description: "3-inch Mandrel",
      toolType: null,
      status: "ACTIVE",
      price: 1250.0,
      owner: "GUIBE",
      location: null,
      isProprietary: false,
    });
  });

  it("returns null for TOOLNO 0", () => {
    expect(mapTool({ TOOLNO: 0, TOOLNAME: "Test" })).toBeNull();
  });

  it("maps inactive tools to RETIRED status", () => {
    const result = mapTool({ TOOLNO: 1, TOOLNAME: "T", ACTIVE: false });
    expect(result?.status).toBe("RETIRED");
  });

  it("maps active tools to ACTIVE status", () => {
    const result = mapTool({ TOOLNO: 1, TOOLNAME: "T", ACTIVE: true });
    expect(result?.status).toBe("ACTIVE");
  });
});

describe("mapToolPart", () => {
  it("maps VFP parts record with uppercase fields", () => {
    const result = mapToolPart({
      PARTNO: 101,
      TOOLNO: 42,
      QTY: 2,
      PARTNAME: "Bearing                            ",
      PRICE1: 85.5,
      PRICE2: 90.0,
    });
    expect(result).toEqual({
      toolNo: 42,
      partNo: "101",
      description: "Bearing",
      price: 85.5,
      quantity: 2,
    });
  });

  it("returns null for TOOLNO 0", () => {
    expect(
      mapToolPart({ TOOLNO: 0, PARTNO: 1, PARTNAME: "Test" })
    ).toBeNull();
  });
});
