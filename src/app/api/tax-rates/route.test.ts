import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { GET } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeRequest(queryString = "") {
  const url = queryString
    ? `http://localhost:3000/api/tax-rates?${queryString}`
    : "http://localhost:3000/api/tax-rates";
  return new NextRequest(new URL(url));
}

describe("GET /api/tax-rates", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns current GST rate when date param provided", async () => {
    mockPrisma.taxRate.findFirst.mockResolvedValueOnce({
      id: "rate-1",
      taxId: "GST",
      effectiveDate: new Date("2015-10-01"),
      expiryDate: new Date("2099-12-31"),
      rate: 1.0,
      createdAt: new Date(),
    } as never);

    const res = await GET(makeRequest("date=2024-06-15"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rate).toBe(1);
    expect(body.taxId).toBe("GST");
  });

  it("returns all tax rates when no date param", async () => {
    mockPrisma.taxRate.findMany.mockResolvedValueOnce([
      {
        id: "rate-1",
        taxId: "GST",
        effectiveDate: new Date("2000-01-01"),
        expiryDate: new Date("2015-09-30"),
        rate: 10.0,
        createdAt: new Date(),
      },
      {
        id: "rate-2",
        taxId: "GST",
        effectiveDate: new Date("2015-10-01"),
        expiryDate: new Date("2099-12-31"),
        rate: 1.0,
        createdAt: new Date(),
      },
    ] as never);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it("returns 404 when no rate found for given date", async () => {
    mockPrisma.taxRate.findFirst.mockResolvedValueOnce(null);
    const res = await GET(makeRequest("date=1990-01-01"));
    expect(res.status).toBe(404);
  });
});
