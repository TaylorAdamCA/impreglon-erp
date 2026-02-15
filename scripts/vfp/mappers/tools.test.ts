import { describe, it, expect } from "vitest";
import { mapTool, mapToolPart } from "./tools";

describe("mapTool", () => {
  it("maps VFP tool record", () => {
    const result = mapTool({
      toolno: 42,
      description: "3-inch Mandrel    ",
      tooltype: "MANDREL   ",
      status: "ACTIVE    ",
      price: 1250.0,
      owner: "Acme Oil  ",
      location: "Shop A    ",
    });
    expect(result).toEqual({
      toolNo: 42,
      description: "3-inch Mandrel",
      toolType: "MANDREL",
      status: "ACTIVE",
      price: 1250.0,
      owner: "Acme Oil",
      location: "Shop A",
      isProprietary: false,
    });
  });

  it("returns null for toolno 0", () => {
    expect(mapTool({ toolno: 0, description: "Test" })).toBeNull();
  });

  it("maps VFP status strings to ToolStatus enum values", () => {
    expect(mapTool({ toolno: 1, description: "T", status: "ACTIVE" })?.status).toBe("ACTIVE");
    expect(mapTool({ toolno: 1, description: "T", status: "RECEIVED" })?.status).toBe("RECEIVED");
    expect(mapTool({ toolno: 1, description: "T", status: "IN_USE" })?.status).toBe("IN_USE");
    expect(mapTool({ toolno: 1, description: "T", status: "UNKNOWN" })?.status).toBe("ACTIVE");
  });
});

describe("mapToolPart", () => {
  it("maps VFP parts record", () => {
    const result = mapToolPart({
      toolno: 42,
      partno: "P-001     ",
      description: "Bearing   ",
      price: 85.5,
      quantity: 2,
    });
    expect(result).toEqual({
      toolNo: 42,
      partNo: "P-001",
      description: "Bearing",
      price: 85.5,
      quantity: 2,
    });
  });

  it("returns null for toolno 0", () => {
    expect(mapToolPart({ toolno: 0, partno: "P-001", description: "Test" })).toBeNull();
  });
});
