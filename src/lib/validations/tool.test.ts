import { describe, it, expect } from "vitest";
import {
  toolSchema,
  toolPartSchema,
  toolAssignmentSchema,
  toolReceiptSchema,
  toolStatusSchema,
} from "./tool";

describe("toolSchema", () => {
  it("accepts valid tool data", () => {
    const result = toolSchema.safeParse({
      description: "Ball Valve Mandrel",
      toolType: "Mandrel",
      price: 150.50,
      owner: "Suncor",
      location: "Shop Floor",
      isProprietary: true,
    });
    expect(result.success).toBe(true);
  });

  it("requires description", () => {
    const result = toolSchema.safeParse({ description: "" });
    expect(result.success).toBe(false);
  });

  it("accepts minimal data (description only)", () => {
    const result = toolSchema.safeParse({ description: "Simple Tool" });
    expect(result.success).toBe(true);
  });

  it("rejects negative price", () => {
    const result = toolSchema.safeParse({ description: "Test", price: -10 });
    expect(result.success).toBe(false);
  });
});

describe("toolPartSchema", () => {
  it("accepts valid part data", () => {
    const result = toolPartSchema.safeParse({
      partNo: "P-001",
      description: "O-Ring seal",
      price: 5.25,
      quantity: 4,
    });
    expect(result.success).toBe(true);
  });

  it("requires partNo and description", () => {
    const result = toolPartSchema.safeParse({ partNo: "" });
    expect(result.success).toBe(false);
  });

  it("rejects zero quantity", () => {
    const result = toolPartSchema.safeParse({
      partNo: "P-001",
      description: "O-Ring",
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("toolAssignmentSchema", () => {
  it("accepts valid assignment", () => {
    const result = toolAssignmentSchema.safeParse({
      orderId: "order-1",
      assignment: "Primary coating tool",
    });
    expect(result.success).toBe(true);
  });

  it("requires orderId", () => {
    const result = toolAssignmentSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("toolReceiptSchema", () => {
  it("accepts valid receipt data", () => {
    const result = toolReceiptSchema.safeParse({
      condition: "Good",
      notes: "Received in original packaging",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty receipt (no condition or notes)", () => {
    const result = toolReceiptSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("toolStatusSchema", () => {
  it("accepts valid status", () => {
    const result = toolStatusSchema.safeParse({ status: "RECEIVED" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = toolStatusSchema.safeParse({ status: "INVALID" });
    expect(result.success).toBe(false);
  });
});
