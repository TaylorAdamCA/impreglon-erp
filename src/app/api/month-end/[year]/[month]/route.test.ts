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

import { GET, POST, DELETE } from "./route";

const paramsPromise = Promise.resolve({ year: "2026", month: "1" });

describe("GET /api/month-end/[year]/[month]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = new NextRequest(new URL("http://localhost:3000/api/month-end/2026/1"));
    const res = await GET(req, { params: paramsPromise });
    expect(res.status).toBe(401);
  });

  it("returns snapshots for the period", async () => {
    mockPrisma.monthEndSnapshot.findMany.mockResolvedValueOnce([
      { id: "s1", orderNo: 100, companyName: "Acme", orderTotal: 10000, percentComplete: 50, accrual: 5000 },
    ] as never);

    const req = new NextRequest(new URL("http://localhost:3000/api/month-end/2026/1"));
    const res = await GET(req, { params: paramsPromise });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.snapshots).toHaveLength(1);
  });
});

describe("POST /api/month-end/[year]/[month]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 403 without monthend permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    const req = new NextRequest(new URL("http://localhost:3000/api/month-end/2026/1"), { method: "POST" });
    const res = await POST(req, { params: paramsPromise });
    expect(res.status).toBe(403);
  });

  it("returns 400 if snapshots already exist for period", async () => {
    mockPrisma.monthEndSnapshot.count.mockResolvedValueOnce(5);
    const req = new NextRequest(new URL("http://localhost:3000/api/month-end/2026/1"), { method: "POST" });
    const res = await POST(req, { params: paramsPromise });
    expect(res.status).toBe(400);
  });

  it("seeds snapshots from in-progress orders", async () => {
    mockPrisma.monthEndSnapshot.count.mockResolvedValueOnce(0);
    mockPrisma.order.findMany.mockResolvedValueOnce([
      {
        id: "ord-1",
        orderNo: 100,
        customerId: "cust-1",
        orderTotal: 10000,
        customer: { company: "Acme Corp" },
      },
    ] as never);
    mockPrisma.monthEndSnapshot.createMany.mockResolvedValueOnce({ count: 1 } as never);

    const req = new NextRequest(new URL("http://localhost:3000/api/month-end/2026/1"), { method: "POST" });
    const res = await POST(req, { params: paramsPromise });
    expect(res.status).toBe(201);

    expect(mockPrisma.monthEndSnapshot.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          orderId: "ord-1",
          orderNo: 100,
          customerId: "cust-1",
          companyName: "Acme Corp",
          percentComplete: 0,
          accrual: 0,
          reportMonth: 1,
          reportYear: 2026,
        }),
      ],
    });
  });

  it("returns empty result when no in-progress orders", async () => {
    mockPrisma.monthEndSnapshot.count.mockResolvedValueOnce(0);
    mockPrisma.order.findMany.mockResolvedValueOnce([]);
    mockPrisma.monthEndSnapshot.createMany.mockResolvedValueOnce({ count: 0 } as never);

    const req = new NextRequest(new URL("http://localhost:3000/api/month-end/2026/1"), { method: "POST" });
    const res = await POST(req, { params: paramsPromise });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.count).toBe(0);
  });
});

describe("DELETE /api/month-end/[year]/[month]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("deletes all snapshots for the period", async () => {
    mockPrisma.monthEndSnapshot.deleteMany.mockResolvedValueOnce({ count: 5 } as never);

    const req = new NextRequest(new URL("http://localhost:3000/api/month-end/2026/1"), { method: "DELETE" });
    const res = await DELETE(req, { params: paramsPromise });
    expect(res.status).toBe(200);

    expect(mockPrisma.monthEndSnapshot.deleteMany).toHaveBeenCalledWith({
      where: { reportMonth: 1, reportYear: 2026 },
    });
  });
});
