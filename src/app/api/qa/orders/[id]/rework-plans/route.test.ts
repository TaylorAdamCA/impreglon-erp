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

import { POST } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeRequest(body: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/qa/orders/order-1/rework-plans"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

const paramsPromise = Promise.resolve({ id: "order-1" });

const validBody = {
  reworkId: "rework-1",
  productType: "222M",
  templateId: "template-1",
  qaNotes: "Coating peeling on threads",
  coatingFailure: "Adhesion failure",
  methodFailure: "Incorrect prep",
  operations: "Strip and recoat",
  department: "Shop Floor",
};

describe("POST /api/qa/orders/[id]/rework-plans", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await POST(makeRequest(validBody), {
      params: paramsPromise,
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when user lacks QA_MANAGE permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await POST(makeRequest(validBody), {
      params: paramsPromise,
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
    expect(mockHasPermission).toHaveBeenCalledWith(
      "test-user-id",
      "QA_MANAGE"
    );
  });

  it("returns 404 when order not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);

    const res = await POST(makeRequest(validBody), {
      params: paramsPromise,
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Order not found");
  });

  it("returns 400 for validation failure (missing productType)", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
    } as never);

    const res = await POST(
      makeRequest({ reworkId: "rework-1" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toBeDefined();
  });

  it("returns 404 when rework item not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
    } as never);
    mockPrisma.rework.findUnique.mockResolvedValueOnce(null);

    const res = await POST(makeRequest(validBody), {
      params: paramsPromise,
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Rework item not found");
  });

  it("returns 404 when rework item belongs to a different order", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
    } as never);
    mockPrisma.rework.findUnique.mockResolvedValueOnce({
      id: "rework-1",
      orderId: "order-other",
      status: "FLAGGED",
    } as never);

    const res = await POST(makeRequest(validBody), {
      params: paramsPromise,
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Rework item not found");
  });

  it("returns 400 when rework item is not FLAGGED (already has plan)", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
    } as never);
    mockPrisma.rework.findUnique.mockResolvedValueOnce({
      id: "rework-1",
      orderId: "order-1",
      status: "PLAN_CREATED",
    } as never);

    const res = await POST(makeRequest(validBody), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Rework item already has a plan");
  });

  it("returns 201, creates plan and links to rework item with status PLAN_CREATED", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
    } as never);
    mockPrisma.rework.findUnique.mockResolvedValueOnce({
      id: "rework-1",
      orderId: "order-1",
      status: "FLAGGED",
    } as never);
    mockPrisma.reworkMemo.create.mockResolvedValueOnce({
      id: "memo-1",
      planNo: 1,
      productType: "222M",
      processTemplate: "template-1",
      qaNotes: "Coating peeling on threads",
      coatingFailure: "Adhesion failure",
      methodFailure: "Incorrect prep",
      operations: "Strip and recoat",
      department: "Shop Floor",
      createdById: "test-user-id",
    } as never);
    mockPrisma.rework.update.mockResolvedValueOnce({
      id: "rework-1",
      orderId: "order-1",
      status: "PLAN_CREATED",
      reworkMemoId: "memo-1",
    } as never);

    const res = await POST(makeRequest(validBody), {
      params: paramsPromise,
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.rework.id).toBe("rework-1");
    expect(body.rework.status).toBe("PLAN_CREATED");
    expect(body.rework.reworkMemoId).toBe("memo-1");
    expect(body.plan.id).toBe("memo-1");
    expect(body.plan.productType).toBe("222M");

    expect(mockPrisma.reworkMemo.create).toHaveBeenCalledWith({
      data: {
        productType: "222M",
        processTemplate: "template-1",
        qaNotes: "Coating peeling on threads",
        coatingFailure: "Adhesion failure",
        methodFailure: "Incorrect prep",
        operations: "Strip and recoat",
        department: "Shop Floor",
        createdById: "test-user-id",
      },
    });

    expect(mockPrisma.rework.update).toHaveBeenCalledWith({
      where: { id: "rework-1" },
      data: {
        reworkMemoId: "memo-1",
        status: "PLAN_CREATED",
      },
    });
  });

  it("sets optional fields to null when not provided", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
    } as never);
    mockPrisma.rework.findUnique.mockResolvedValueOnce({
      id: "rework-1",
      orderId: "order-1",
      status: "FLAGGED",
    } as never);
    mockPrisma.reworkMemo.create.mockResolvedValueOnce({
      id: "memo-2",
      planNo: 2,
      productType: "505",
      processTemplate: null,
      qaNotes: null,
      coatingFailure: null,
      methodFailure: null,
      operations: null,
      department: null,
      createdById: "test-user-id",
    } as never);
    mockPrisma.rework.update.mockResolvedValueOnce({
      id: "rework-1",
      orderId: "order-1",
      status: "PLAN_CREATED",
      reworkMemoId: "memo-2",
    } as never);

    const res = await POST(
      makeRequest({ reworkId: "rework-1", productType: "505" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(201);

    expect(mockPrisma.reworkMemo.create).toHaveBeenCalledWith({
      data: {
        productType: "505",
        processTemplate: null,
        qaNotes: null,
        coatingFailure: null,
        methodFailure: null,
        operations: null,
        department: null,
        createdById: "test-user-id",
      },
    });
  });
});
