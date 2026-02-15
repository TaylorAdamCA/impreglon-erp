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

function makeRequest() {
  return new NextRequest(new URL("http://localhost:3000/api/month-end"));
}

describe("GET /api/month-end", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 403 without monthend permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it("returns grouped period summaries", async () => {
    mockPrisma.monthEndSnapshot.findMany.mockResolvedValueOnce([
      { reportYear: 2026, reportMonth: 1, orderTotal: 10000, accrual: 5000 },
      { reportYear: 2026, reportMonth: 1, orderTotal: 20000, accrual: 15000 },
      { reportYear: 2025, reportMonth: 12, orderTotal: 8000, accrual: 2000 },
    ] as never);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.periods).toHaveLength(2);
    expect(body.periods[0].year).toBe(2026);
    expect(body.periods[0].month).toBe(1);
    expect(body.periods[0].orderCount).toBe(2);
  });
});
