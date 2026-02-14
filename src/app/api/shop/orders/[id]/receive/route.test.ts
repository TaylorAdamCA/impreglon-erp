import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

vi.mock("@/lib/permissions");
import { hasPermission } from "@/lib/permissions";
const mockHasPermission = vi.mocked(hasPermission);

import { PATCH } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeRequest(body: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/shop/orders/order-1/receive"),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

const paramsPromise = Promise.resolve({ id: "order-1" });

describe("PATCH /api/shop/orders/[id]/receive", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PATCH(
      makeRequest({ detailId: "detail-1", received: true }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when user lacks SHOP_RECEIVE permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await PATCH(
      makeRequest({ detailId: "detail-1", received: true }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
    expect(mockHasPermission).toHaveBeenCalledWith(
      "test-user-id",
      "SHOP_RECEIVE"
    );
  });

  it("returns 404 when order not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);

    const res = await PATCH(
      makeRequest({ detailId: "detail-1", received: true }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Order not found");
  });

  it("returns 400 when order is not IN_PROGRESS", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
    } as never);

    const res = await PATCH(
      makeRequest({ detailId: "detail-1", received: true }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only in-progress orders can receive items");
  });

  it("returns 400 for validation failure (missing detailId)", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);

    const res = await PATCH(makeRequest({ received: true }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toBeDefined();
  });

  it("returns 400 for validation failure (missing received)", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);

    const res = await PATCH(makeRequest({ detailId: "detail-1" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 404 when detail not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);
    mockPrisma.orderDetail.findUnique.mockResolvedValueOnce(null);

    const res = await PATCH(
      makeRequest({ detailId: "detail-999", received: true }),
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
      makeRequest({ detailId: "detail-1", received: true }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Order detail not found");
  });

  it("marks detail as received (receivedAt set)", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);
    mockPrisma.orderDetail.findUnique.mockResolvedValueOnce({
      id: "detail-1",
      orderId: "order-1",
    } as never);
    mockPrisma.orderDetail.update.mockResolvedValueOnce({
      id: "detail-1",
      orderId: "order-1",
      receivedAt: new Date("2026-02-13T00:00:00Z"),
    } as never);

    const res = await PATCH(
      makeRequest({ detailId: "detail-1", received: true }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("detail-1");
    expect(body.receivedAt).toBeDefined();

    const updateCall = mockPrisma.orderDetail.update.mock.calls[0][0];
    expect(updateCall).toEqual(
      expect.objectContaining({
        where: { id: "detail-1" },
        data: expect.objectContaining({
          receivedAt: expect.any(Date),
        }),
      })
    );
  });

  it("unmarks detail as received (receivedAt null)", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);
    mockPrisma.orderDetail.findUnique.mockResolvedValueOnce({
      id: "detail-1",
      orderId: "order-1",
    } as never);
    mockPrisma.orderDetail.update.mockResolvedValueOnce({
      id: "detail-1",
      orderId: "order-1",
      receivedAt: null,
    } as never);

    const res = await PATCH(
      makeRequest({ detailId: "detail-1", received: false }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("detail-1");
    expect(body.receivedAt).toBeNull();

    const updateCall = mockPrisma.orderDetail.update.mock.calls[0][0];
    expect(updateCall).toEqual(
      expect.objectContaining({
        where: { id: "detail-1" },
        data: { receivedAt: null },
      })
    );
  });
});
