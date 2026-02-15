import { describe, it, expect, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { lookupGstRate, calculateGst } from "./gst";

const mockPrisma = vi.mocked(prisma);

describe("calculateGst", () => {
  it("calculates GST from total and rate", () => {
    expect(calculateGst(10000, 5)).toBe(500);
  });

  it("rounds to 2 decimal places", () => {
    expect(calculateGst(99.99, 5)).toBe(5);
  });

  it("returns 0 for 0% rate", () => {
    expect(calculateGst(10000, 0)).toBe(0);
  });

  it("returns 0 for 0 total", () => {
    expect(calculateGst(0, 5)).toBe(0);
  });
});

describe("lookupGstRate", () => {
  it("returns rate when found", async () => {
    mockPrisma.taxRate.findFirst.mockResolvedValueOnce({
      id: "tr-1",
      taxId: "GST",
      rate: 5,
      effectiveDate: new Date("2020-01-01"),
      expiryDate: new Date("2099-12-31"),
    } as never);

    const rate = await lookupGstRate(new Date("2026-01-15"));
    expect(rate).toBe(5);
  });

  it("returns null when no rate found", async () => {
    mockPrisma.taxRate.findFirst.mockResolvedValueOnce(null);

    const rate = await lookupGstRate(new Date("1990-01-01"));
    expect(rate).toBeNull();
  });
});
