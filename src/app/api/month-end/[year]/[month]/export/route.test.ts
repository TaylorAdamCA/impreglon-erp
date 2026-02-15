import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
  getUserPermissions: vi.fn().mockResolvedValue([]),
}));
import { hasPermission } from "@/lib/permissions";
const mockHasPermission = vi.mocked(hasPermission);

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

import { GET } from "./route";

const paramsPromise = Promise.resolve({ year: "2026", month: "1" });

describe("GET /api/month-end/[year]/[month]/export", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = new NextRequest(new URL("http://localhost:3000/api/month-end/2026/1/export"));
    const res = await GET(req, { params: paramsPromise });
    expect(res.status).toBe(401);
  });

  it("returns CSV with correct headers", async () => {
    mockPrisma.monthEndSnapshot.findMany.mockResolvedValueOnce([
      {
        orderNo: 100,
        customerId: "c1",
        companyName: "Acme Corp",
        orderTotal: 10000,
        percentComplete: 50,
        accrual: 5000,
        reportMonth: 1,
        reportYear: 2026,
      },
    ] as never);

    const req = new NextRequest(new URL("http://localhost:3000/api/month-end/2026/1/export"));
    const res = await GET(req, { params: paramsPromise });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv");
    expect(res.headers.get("content-disposition")).toContain("month-end-2026-01.csv");

    const text = await res.text();
    expect(text).toContain("Order #");
    expect(text).toContain("Acme Corp");
    expect(text).toContain("10000");
    expect(text).toContain("50");
    expect(text).toContain("5000");
  });

  it("returns empty CSV when no snapshots", async () => {
    mockPrisma.monthEndSnapshot.findMany.mockResolvedValueOnce([]);

    const req = new NextRequest(new URL("http://localhost:3000/api/month-end/2026/1/export"));
    const res = await GET(req, { params: paramsPromise });
    expect(res.status).toBe(200);
    const text = await res.text();
    const lines = text.trim().split("\n");
    expect(lines).toHaveLength(1); // header only
  });
});
