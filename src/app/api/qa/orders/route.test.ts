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

import { GET } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeRequest(queryString = "") {
  const url = queryString
    ? `http://localhost:3000/api/qa/orders?${queryString}`
    : "http://localhost:3000/api/qa/orders";
  return new NextRequest(new URL(url));
}

const sampleOrders = [
  {
    id: "order-1",
    status: "IN_PROGRESS",
    createdAt: new Date("2024-01-15"),
    customer: { id: "cust-1", company: "Acme Corp" },
    details: [
      { quantity: 10, passedQty: 5, reworkQty: 2 },
      { quantity: 20, passedQty: 10, reworkQty: 0 },
    ],
    reworkItems: [
      { id: "rework-1", resolved: false, status: "FLAGGED" },
    ],
  },
  {
    id: "order-2",
    status: "REWORK",
    createdAt: new Date("2024-01-10"),
    customer: { id: "cust-2", company: "Widget Co" },
    details: [
      { quantity: 15, passedQty: 8, reworkQty: 5 },
    ],
    reworkItems: [
      { id: "rework-2", resolved: true, status: "RESOLVED" },
      { id: "rework-3", resolved: false, status: "IN_PROGRESS" },
    ],
  },
];

describe("GET /api/qa/orders", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when user lacks QA_MANAGE permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await GET(makeRequest());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
    expect(mockHasPermission).toHaveBeenCalledWith(
      "test-user-id",
      "QA_MANAGE"
    );
  });

  it("returns 200 with default filter (IN_PROGRESS + REWORK)", async () => {
    mockPrisma.order.findMany.mockResolvedValueOnce(sampleOrders as never);

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
      where: { status: { in: ["IN_PROGRESS", "REWORK"] } },
      include: {
        customer: { select: { id: true, company: true } },
        details: {
          select: { quantity: true, passedQty: true, reworkQty: true },
        },
        reworkItems: {
          select: { id: true, resolved: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns 200 and filters by status=rework", async () => {
    const reworkOrders = [sampleOrders[1]];
    mockPrisma.order.findMany.mockResolvedValueOnce(reworkOrders as never);

    const res = await GET(makeRequest("status=rework"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].status).toBe("REWORK");

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "REWORK" },
      })
    );
  });

  it("returns 200 and filters by status=in_progress", async () => {
    const inProgressOrders = [sampleOrders[0]];
    mockPrisma.order.findMany.mockResolvedValueOnce(
      inProgressOrders as never
    );

    const res = await GET(makeRequest("status=in_progress"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].status).toBe("IN_PROGRESS");

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "IN_PROGRESS" },
      })
    );
  });

  it("includes customer, details with QA counts, and rework items", async () => {
    mockPrisma.order.findMany.mockResolvedValueOnce(sampleOrders as never);

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();

    // Verify customer data
    expect(body[0].customer).toEqual({ id: "cust-1", company: "Acme Corp" });
    expect(body[1].customer).toEqual({ id: "cust-2", company: "Widget Co" });

    // Verify details with QA quantities
    expect(body[0].details).toHaveLength(2);
    expect(body[0].details[0]).toEqual({
      quantity: 10,
      passedQty: 5,
      reworkQty: 2,
    });
    expect(body[0].details[1]).toEqual({
      quantity: 20,
      passedQty: 10,
      reworkQty: 0,
    });

    // Verify rework items
    expect(body[0].reworkItems).toHaveLength(1);
    expect(body[0].reworkItems[0]).toEqual({
      id: "rework-1",
      resolved: false,
      status: "FLAGGED",
    });

    expect(body[1].reworkItems).toHaveLength(2);
    expect(body[1].reworkItems[0]).toEqual({
      id: "rework-2",
      resolved: true,
      status: "RESOLVED",
    });
  });

  it("returns empty array when no matching orders", async () => {
    mockPrisma.order.findMany.mockResolvedValueOnce([] as never);

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("uses default filter for unknown status values", async () => {
    mockPrisma.order.findMany.mockResolvedValueOnce([] as never);

    const res = await GET(makeRequest("status=unknown"));

    expect(res.status).toBe(200);

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: ["IN_PROGRESS", "REWORK"] } },
      })
    );
  });
});
