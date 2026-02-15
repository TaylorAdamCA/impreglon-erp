import { describe, it, expect } from "vitest";
import {
  invoiceModifySchema,
  invoiceDraftSchema,
} from "./invoice";

describe("invoiceDraftSchema", () => {
  it("accepts valid draft data with no overrides", () => {
    const result = invoiceDraftSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts valid draft data with optional notes", () => {
    const result = invoiceDraftSchema.safeParse({ notes: "Rush invoice" });
    expect(result.success).toBe(true);
  });

  it("accepts gstOverride as a number", () => {
    const result = invoiceDraftSchema.safeParse({ gstOverride: 150.5 });
    expect(result.success).toBe(true);
  });

  it("rejects negative gstOverride", () => {
    const result = invoiceDraftSchema.safeParse({ gstOverride: -10 });
    expect(result.success).toBe(false);
  });
});

describe("invoiceModifySchema", () => {
  it("accepts valid modification with notes", () => {
    const result = invoiceModifySchema.safeParse({ notes: "Corrected amount" });
    expect(result.success).toBe(true);
  });

  it("accepts gstOverride as a number", () => {
    const result = invoiceModifySchema.safeParse({ gstOverride: 200.0 });
    expect(result.success).toBe(true);
  });

  it("rejects negative gstOverride", () => {
    const result = invoiceModifySchema.safeParse({ gstOverride: -5 });
    expect(result.success).toBe(false);
  });

  it("accepts empty object (no changes)", () => {
    const result = invoiceModifySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects notes exceeding max length", () => {
    const result = invoiceModifySchema.safeParse({
      notes: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});
