import { describe, it, expect } from "vitest";
import { seedPeriodSchema, updatePercentSchema } from "./month-end";

describe("seedPeriodSchema", () => {
  it("accepts valid month and year", () => {
    const result = seedPeriodSchema.safeParse({ month: 6, year: 2026 });
    expect(result.success).toBe(true);
  });

  it("rejects month below 1", () => {
    const result = seedPeriodSchema.safeParse({ month: 0, year: 2026 });
    expect(result.success).toBe(false);
  });

  it("rejects month above 12", () => {
    const result = seedPeriodSchema.safeParse({ month: 13, year: 2026 });
    expect(result.success).toBe(false);
  });

  it("rejects year below 2000", () => {
    const result = seedPeriodSchema.safeParse({ month: 1, year: 1999 });
    expect(result.success).toBe(false);
  });
});

describe("updatePercentSchema", () => {
  it("accepts valid 25% increment values", () => {
    for (const val of [0, 25, 50, 75, 100]) {
      const result = updatePercentSchema.safeParse({ percentComplete: val });
      expect(result.success).toBe(true);
    }
  });

  it("rejects non-increment values", () => {
    const result = updatePercentSchema.safeParse({ percentComplete: 30 });
    expect(result.success).toBe(false);
  });

  it("rejects negative values", () => {
    const result = updatePercentSchema.safeParse({ percentComplete: -25 });
    expect(result.success).toBe(false);
  });

  it("rejects values over 100", () => {
    const result = updatePercentSchema.safeParse({ percentComplete: 125 });
    expect(result.success).toBe(false);
  });
});
