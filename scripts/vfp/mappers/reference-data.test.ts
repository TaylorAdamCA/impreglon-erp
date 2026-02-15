import { describe, it, expect } from "vitest";
import {
  mapCoatingFailure,
  mapMethodFailure,
  mapOperation,
} from "./reference-data";

describe("mapCoatingFailure", () => {
  it("maps VFP coating failure with FAILNO and REASON", () => {
    const result = mapCoatingFailure({
      FAILNO: 1,
      REASON: "Adhesion Loss       ",
    });
    expect(result).toEqual({
      code: "1",
      description: "Adhesion Loss",
      isActive: true,
    });
  });

  it("returns null for FAILNO 0", () => {
    expect(mapCoatingFailure({ FAILNO: 0, REASON: "Test" })).toBeNull();
  });

  it("uses FAILNO as description when REASON is empty", () => {
    const result = mapCoatingFailure({ FAILNO: 5, REASON: "     " });
    expect(result?.description).toBe("5");
  });
});

describe("mapMethodFailure", () => {
  it("maps VFP method failure with FAILNO and REASON", () => {
    const result = mapMethodFailure({
      FAILNO: 3,
      REASON: "Process Error       ",
    });
    expect(result).toEqual({
      code: "3",
      description: "Process Error",
      isActive: true,
    });
  });

  it("returns null for FAILNO 0", () => {
    expect(mapMethodFailure({ FAILNO: 0, REASON: "Test" })).toBeNull();
  });
});

describe("mapOperation", () => {
  it("maps VFP operation with single OPERATION field", () => {
    const result = mapOperation({
      OPERATION: "Grit Blast               ",
    });
    expect(result).toEqual({
      code: "Grit Blast",
      name: "Grit Blast",
      description: null,
    });
  });

  it("returns null for empty OPERATION", () => {
    expect(
      mapOperation({ OPERATION: "                         " })
    ).toBeNull();
  });
});
