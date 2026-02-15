import { describe, it, expect } from "vitest";
import { mapCoatingFailure, mapMethodFailure, mapOperation } from "./reference-data";

describe("mapCoatingFailure", () => {
  it("maps VFP coating failure record", () => {
    const result = mapCoatingFailure({
      code: "CF001     ",
      description: "Adhesion Loss     ",
    });
    expect(result).toEqual({
      code: "CF001",
      description: "Adhesion Loss",
      isActive: true,
    });
  });

  it("returns null for empty code", () => {
    expect(mapCoatingFailure({ code: "    ", description: "Test" })).toBeNull();
  });
});

describe("mapMethodFailure", () => {
  it("maps VFP method failure record", () => {
    const result = mapMethodFailure({
      code: "MF001     ",
      description: "Process Error     ",
    });
    expect(result).toEqual({
      code: "MF001",
      description: "Process Error",
      isActive: true,
    });
  });

  it("returns null for empty code", () => {
    expect(mapMethodFailure({ code: "", description: "Test" })).toBeNull();
  });
});

describe("mapOperation", () => {
  it("maps VFP operation record", () => {
    const result = mapOperation({
      code: "BLAST     ",
      name: "Grit Blast        ",
      description: "Surface prep      ",
    });
    expect(result).toEqual({
      code: "BLAST",
      name: "Grit Blast",
      description: "Surface prep",
    });
  });

  it("returns null for empty code", () => {
    expect(mapOperation({ code: "   ", name: "Test" })).toBeNull();
  });
});
