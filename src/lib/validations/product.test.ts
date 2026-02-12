import { describe, it, expect } from "vitest";
import { productSchema, coatingPriceLabelSchema } from "./product";

describe("productSchema", () => {
  const validProduct = {
    libraryType: "ANSI_VALVE" as const,
    catalogSource: "A",
    description: '2" Gate Valve 600#',
    size: '2"',
    type: "Gate",
  };

  it("accepts valid product data", () => {
    const result = productSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it("accepts minimal data (libraryType + description)", () => {
    const result = productSchema.safeParse({
      libraryType: "FITTING",
      description: "90 Degree Elbow",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing description", () => {
    const result = productSchema.safeParse({ libraryType: "ANSI_VALVE" });
    expect(result.success).toBe(false);
  });

  it("rejects empty description", () => {
    const result = productSchema.safeParse({
      libraryType: "ANSI_VALVE",
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing libraryType", () => {
    const result = productSchema.safeParse({ description: "Test" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid libraryType enum", () => {
    const result = productSchema.safeParse({
      libraryType: "INVALID_TYPE",
      description: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid library types", () => {
    const types = [
      "ANSI_VALVE",
      "WELLHEAD_VALVE",
      "FITTING",
      "PUP_JOINT",
      "WELLHEAD_COMPONENT",
      "ACCESSORY",
    ];
    for (const libraryType of types) {
      const result = productSchema.safeParse({
        libraryType,
        description: "Test",
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects description exceeding 500 chars", () => {
    const result = productSchema.safeParse({
      libraryType: "ANSI_VALVE",
      description: "A".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty string for optional catalogSource", () => {
    const result = productSchema.safeParse({
      libraryType: "ANSI_VALVE",
      description: "Test",
      catalogSource: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("coatingPriceLabelSchema", () => {
  const validLabel = {
    libraryType: "ANSI_VALVE" as const,
    slotNumber: 1,
    coatingName: "Xylan 1070",
    areaSpec: "Full Body",
  };

  it("accepts valid coating price label", () => {
    const result = coatingPriceLabelSchema.safeParse(validLabel);
    expect(result.success).toBe(true);
  });

  it("rejects missing coatingName", () => {
    const result = coatingPriceLabelSchema.safeParse({
      libraryType: "ANSI_VALVE",
      slotNumber: 1,
      areaSpec: "Full Body",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty coatingName", () => {
    const result = coatingPriceLabelSchema.safeParse({
      ...validLabel,
      coatingName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing areaSpec", () => {
    const result = coatingPriceLabelSchema.safeParse({
      libraryType: "ANSI_VALVE",
      slotNumber: 1,
      coatingName: "Xylan 1070",
    });
    expect(result.success).toBe(false);
  });

  it("rejects slotNumber below 1", () => {
    const result = coatingPriceLabelSchema.safeParse({
      ...validLabel,
      slotNumber: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects slotNumber above 8", () => {
    const result = coatingPriceLabelSchema.safeParse({
      ...validLabel,
      slotNumber: 9,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer slotNumber", () => {
    const result = coatingPriceLabelSchema.safeParse({
      ...validLabel,
      slotNumber: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("accepts slotNumbers 1 through 8", () => {
    for (let i = 1; i <= 8; i++) {
      const result = coatingPriceLabelSchema.safeParse({
        ...validLabel,
        slotNumber: i,
      });
      expect(result.success).toBe(true);
    }
  });
});
