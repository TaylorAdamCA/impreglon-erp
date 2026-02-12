import { describe, it, expect } from "vitest";
import {
  createQuoteSchema,
  quoteComponentSchema,
  quoteStatusSchema,
} from "./quote";

describe("createQuoteSchema", () => {
  it("accepts valid customerId", () => {
    const result = createQuoteSchema.safeParse({
      customerId: "cust_abc123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing customerId", () => {
    const result = createQuoteSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty customerId", () => {
    const result = createQuoteSchema.safeParse({ customerId: "" });
    expect(result.success).toBe(false);
  });
});

describe("quoteComponentSchema", () => {
  const validComponent = {
    description: '2" Gate Valve 600# — Xylan 1070 Full Body',
    quantity: 10,
    unitPrice: 245.5,
    libraryType: "ANSI_VALVE" as const,
    libraryItemId: "lib_xyz789",
    coatingSlot: 3,
  };

  it("accepts valid full data", () => {
    const result = quoteComponentSchema.safeParse(validComponent);
    expect(result.success).toBe(true);
  });

  it("accepts valid minimal data (description + quantity + unitPrice)", () => {
    const result = quoteComponentSchema.safeParse({
      description: "Custom coating job",
      quantity: 1,
      unitPrice: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing description", () => {
    const result = quoteComponentSchema.safeParse({
      quantity: 5,
      unitPrice: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty description", () => {
    const result = quoteComponentSchema.safeParse({
      description: "",
      quantity: 5,
      unitPrice: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero quantity", () => {
    const result = quoteComponentSchema.safeParse({
      description: "Test",
      quantity: 0,
      unitPrice: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative quantity", () => {
    const result = quoteComponentSchema.safeParse({
      description: "Test",
      quantity: -1,
      unitPrice: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative price", () => {
    const result = quoteComponentSchema.safeParse({
      description: "Test",
      quantity: 1,
      unitPrice: -0.01,
    });
    expect(result.success).toBe(false);
  });

  it("rejects description exceeding 500 chars", () => {
    const result = quoteComponentSchema.safeParse({
      description: "A".repeat(501),
      quantity: 1,
      unitPrice: 100,
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
      const result = quoteComponentSchema.safeParse({
        description: "Test",
        quantity: 1,
        unitPrice: 50,
        libraryType,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid library type", () => {
    const result = quoteComponentSchema.safeParse({
      description: "Test",
      quantity: 1,
      unitPrice: 50,
      libraryType: "INVALID_TYPE",
    });
    expect(result.success).toBe(false);
  });

  it("accepts coatingSlot values 1 through 8", () => {
    for (let i = 1; i <= 8; i++) {
      const result = quoteComponentSchema.safeParse({
        description: "Test",
        quantity: 1,
        unitPrice: 50,
        coatingSlot: i,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects coatingSlot of 0", () => {
    const result = quoteComponentSchema.safeParse({
      description: "Test",
      quantity: 1,
      unitPrice: 50,
      coatingSlot: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects coatingSlot of 9", () => {
    const result = quoteComponentSchema.safeParse({
      description: "Test",
      quantity: 1,
      unitPrice: 50,
      coatingSlot: 9,
    });
    expect(result.success).toBe(false);
  });
});

describe("quoteStatusSchema", () => {
  it("accepts submit action", () => {
    const result = quoteStatusSchema.safeParse({ action: "submit" });
    expect(result.success).toBe(true);
  });

  it("accepts approve action", () => {
    const result = quoteStatusSchema.safeParse({ action: "approve" });
    expect(result.success).toBe(true);
  });

  it("accepts reject action", () => {
    const result = quoteStatusSchema.safeParse({ action: "reject" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid action", () => {
    const result = quoteStatusSchema.safeParse({ action: "cancel" });
    expect(result.success).toBe(false);
  });

  it("accepts reject with reason string", () => {
    const result = quoteStatusSchema.safeParse({
      action: "reject",
      reason: "Pricing too high for current market conditions",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe(
        "Pricing too high for current market conditions"
      );
    }
  });
});
