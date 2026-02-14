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

import { PATCH } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeRequest(body: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/qa/orders/order-1/inspect"),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

const paramsPromise = Promise.resolve({ id: "order-1" });

describe("PATCH /api/qa/orders/[id]/inspect", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PATCH(
      makeRequest({ detailId: "detail-1", currentPass: 5 }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when user lacks QA_MANAGE permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await PATCH(
      makeRequest({ detailId: "detail-1", currentPass: 5 }),
      { params: paramsPromise }
    );

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

    const res = await PATCH(
      makeRequest({ detailId: "detail-1", currentPass: 5 }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Order not found");
  });

  it("returns 400 when order is not IN_PROGRESS or REWORK", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
    } as never);

    const res = await PATCH(
      makeRequest({ detailId: "detail-1", currentPass: 5 }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe(
      "Only in-progress or rework orders can be inspected"
    );
  });

  it("returns 400 for validation failure (missing detailId)", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);

    const res = await PATCH(makeRequest({ currentPass: 5 }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toBeDefined();
  });

  it("returns 404 when detail not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);
    mockPrisma.orderDetail.findUnique.mockResolvedValueOnce(null);

    const res = await PATCH(
      makeRequest({ detailId: "detail-999", currentPass: 5 }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Order detail not found");
  });

  it("returns 404 when detail belongs to a different order", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);
    mockPrisma.orderDetail.findUnique.mockResolvedValueOnce({
      id: "detail-1",
      orderId: "order-other",
    } as never);

    const res = await PATCH(
      makeRequest({ detailId: "detail-1", currentPass: 5 }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Order detail not found");
  });

  it("returns 400 when inspection quantity exceeds remaining", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);
    mockPrisma.orderDetail.findUnique.mockResolvedValueOnce({
      id: "detail-1",
      orderId: "order-1",
      quantity: 10,
      passedQty: 7,
      reworkQty: 2,
    } as never);

    const res = await PATCH(
      makeRequest({ detailId: "detail-1", currentPass: 2 }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe(
      "Inspection quantity exceeds remaining uninspected items"
    );
  });

  it("returns 200 and increments passedQty (pass only, no rework)", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);
    mockPrisma.orderDetail.findUnique.mockResolvedValueOnce({
      id: "detail-1",
      orderId: "order-1",
      quantity: 10,
      passedQty: 3,
      reworkQty: 0,
    } as never);
    mockPrisma.orderDetail.update.mockResolvedValueOnce({
      id: "detail-1",
      orderId: "order-1",
      quantity: 10,
      currentPass: 5,
      passedQty: 8,
      reworkQty: 0,
    } as never);

    const res = await PATCH(
      makeRequest({ detailId: "detail-1", currentPass: 5 }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("detail-1");
    expect(body.passedQty).toBe(8);
    expect(body.reworkQty).toBe(0);

    const updateCall = mockPrisma.orderDetail.update.mock.calls[0][0];
    expect(updateCall).toEqual(
      expect.objectContaining({
        where: { id: "detail-1" },
        data: {
          currentPass: 5,
          passedQty: 8,
          reworkQty: 0,
        },
      })
    );

    // No rework record should be created
    expect(mockPrisma.rework.create).not.toHaveBeenCalled();
  });

  it("returns 200, increments both passedQty and reworkQty, creates Rework record", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);
    mockPrisma.orderDetail.findUnique.mockResolvedValueOnce({
      id: "detail-1",
      orderId: "order-1",
      quantity: 10,
      passedQty: 2,
      reworkQty: 1,
    } as never);
    mockPrisma.orderDetail.update.mockResolvedValueOnce({
      id: "detail-1",
      orderId: "order-1",
      quantity: 10,
      currentPass: 4,
      passedQty: 6,
      reworkQty: 4,
    } as never);
    mockPrisma.rework.create.mockResolvedValueOnce({
      id: "rework-1",
      orderId: "order-1",
      orderDetailId: "detail-1",
      reworkQty: 3,
      status: "FLAGGED",
    } as never);

    const res = await PATCH(
      makeRequest({ detailId: "detail-1", currentPass: 4, reworkQty: 3 }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("detail-1");
    expect(body.passedQty).toBe(6);
    expect(body.reworkQty).toBe(4);

    const updateCall = mockPrisma.orderDetail.update.mock.calls[0][0];
    expect(updateCall).toEqual(
      expect.objectContaining({
        where: { id: "detail-1" },
        data: {
          currentPass: 4,
          passedQty: 6,
          reworkQty: 4,
        },
      })
    );

    // Rework record should be created with FLAGGED status
    expect(mockPrisma.rework.create).toHaveBeenCalledWith({
      data: {
        orderId: "order-1",
        orderDetailId: "detail-1",
        reworkQty: 3,
        status: "FLAGGED",
      },
    });
  });

  it("allows inspection on REWORK status orders", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "REWORK",
    } as never);
    mockPrisma.orderDetail.findUnique.mockResolvedValueOnce({
      id: "detail-1",
      orderId: "order-1",
      quantity: 10,
      passedQty: 0,
      reworkQty: 0,
    } as never);
    mockPrisma.orderDetail.update.mockResolvedValueOnce({
      id: "detail-1",
      orderId: "order-1",
      quantity: 10,
      currentPass: 3,
      passedQty: 3,
      reworkQty: 0,
    } as never);

    const res = await PATCH(
      makeRequest({ detailId: "detail-1", currentPass: 3 }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("detail-1");
    expect(body.passedQty).toBe(3);
    expect(body.currentPass).toBe(3);
  });
});
