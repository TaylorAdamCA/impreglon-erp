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

import { PATCH } from "./route";

const paramsPromise = Promise.resolve({ year: "2026", month: "1", id: "snap-1" });

function makeRequest(body: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/month-end/2026/1/snap-1"),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

describe("PATCH /api/month-end/[year]/[month]/[id]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest({ percentComplete: 50 }), { params: paramsPromise });
    expect(res.status).toBe(401);
  });

  it("returns 403 without monthend permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    const res = await PATCH(makeRequest({ percentComplete: 50 }), { params: paramsPromise });
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid percent value", async () => {
    const res = await PATCH(makeRequest({ percentComplete: 30 }), { params: paramsPromise });
    expect(res.status).toBe(400);
  });

  it("returns 404 when snapshot not found", async () => {
    mockPrisma.monthEndSnapshot.findUnique.mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest({ percentComplete: 50 }), { params: paramsPromise });
    expect(res.status).toBe(404);
  });

  it("updates percent-complete and auto-calculates accrual", async () => {
    mockPrisma.monthEndSnapshot.findUnique.mockResolvedValueOnce({
      id: "snap-1",
      orderTotal: 10000,
    } as never);
    mockPrisma.monthEndSnapshot.update.mockResolvedValueOnce({
      id: "snap-1",
      percentComplete: 75,
      accrual: 7500,
    } as never);

    const res = await PATCH(makeRequest({ percentComplete: 75 }), { params: paramsPromise });
    expect(res.status).toBe(200);

    expect(mockPrisma.monthEndSnapshot.update).toHaveBeenCalledWith({
      where: { id: "snap-1" },
      data: { percentComplete: 75, accrual: 7500 },
    });
  });

  it("calculates accrual correctly for 0%", async () => {
    mockPrisma.monthEndSnapshot.findUnique.mockResolvedValueOnce({
      id: "snap-1",
      orderTotal: 25000,
    } as never);
    mockPrisma.monthEndSnapshot.update.mockResolvedValueOnce({
      id: "snap-1",
      percentComplete: 0,
      accrual: 0,
    } as never);

    const res = await PATCH(makeRequest({ percentComplete: 0 }), { params: paramsPromise });
    expect(res.status).toBe(200);

    expect(mockPrisma.monthEndSnapshot.update).toHaveBeenCalledWith({
      where: { id: "snap-1" },
      data: { percentComplete: 0, accrual: 0 },
    });
  });
});
