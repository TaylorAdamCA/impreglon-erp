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
    new URL("http://localhost:3000/api/shop/orders/order-1/ship"),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

const paramsPromise = Promise.resolve({ id: "order-1" });

const validShipBody = {
  shipToAddressId: "addr-1",
  carrierName: "FedEx",
};

describe("PATCH /api/shop/orders/[id]/ship", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PATCH(makeRequest({}), { params: paramsPromise });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when user lacks shipping permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await PATCH(makeRequest({}), { params: paramsPromise });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
    expect(mockHasPermission).toHaveBeenCalledWith(
      "test-user-id",
      "shipping"
    );
  });

  it("returns 404 when order not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);

    const res = await PATCH(makeRequest({}), { params: paramsPromise });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Order not found");
  });

  it("returns 400 when order is not READY_TO_SHIP", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);

    const res = await PATCH(makeRequest({}), { params: paramsPromise });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only orders ready to ship can be shipped");
  });

  it("returns 400 for validation failure (missing required fields)", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "READY_TO_SHIP",
    } as never);

    const res = await PATCH(
      makeRequest({}),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toBeDefined();
  });

  it("returns 400 for validation failure (notes too long)", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "READY_TO_SHIP",
    } as never);

    const res = await PATCH(
      makeRequest({ ...validShipBody, notes: "x".repeat(501) }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toBeDefined();
  });

  it("ships order successfully (status SHIPPED, shipDate set, history created)", async () => {
    const shipDate = new Date("2026-02-13T12:00:00Z");
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "READY_TO_SHIP",
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
      status: "SHIPPED",
      shipDate,
    } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({
      id: "history-1",
      orderId: "order-1",
      fromStatus: "READY_TO_SHIP",
      toStatus: "SHIPPED",
      changedById: "test-user-id",
      notes: null,
    } as never);

    const res = await PATCH(makeRequest(validShipBody), { params: paramsPromise });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("order-1");
    expect(body.status).toBe("SHIPPED");
    expect(body.shipDate).toBeDefined();

    // Verify order was updated with correct data
    const updateCall = mockPrisma.order.update.mock.calls[0][0];
    expect(updateCall).toEqual(
      expect.objectContaining({
        where: { id: "order-1" },
        data: expect.objectContaining({
          status: "SHIPPED",
          shipDate: expect.any(Date),
          shipToAddressId: "addr-1",
          carrierName: "FedEx",
          trackingNumber: null,
        }),
      })
    );

    // Verify status history was created
    const historyCall = mockPrisma.orderStatusHistory.create.mock.calls[0][0];
    expect(historyCall).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: "order-1",
          fromStatus: "READY_TO_SHIP",
          toStatus: "SHIPPED",
          changedById: "test-user-id",
          notes: null,
        }),
      })
    );
  });

  it("ships order with notes", async () => {
    const shipDate = new Date("2026-02-13T12:00:00Z");
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "READY_TO_SHIP",
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
      status: "SHIPPED",
      shipDate,
    } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({
      id: "history-1",
      orderId: "order-1",
      fromStatus: "READY_TO_SHIP",
      toStatus: "SHIPPED",
      changedById: "test-user-id",
      notes: "Shipped via FedEx tracking #12345",
    } as never);

    const res = await PATCH(
      makeRequest({ ...validShipBody, notes: "Shipped via FedEx tracking #12345" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("order-1");
    expect(body.status).toBe("SHIPPED");

    // Verify notes were passed to status history
    const historyCall = mockPrisma.orderStatusHistory.create.mock.calls[0][0];
    expect(historyCall).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          notes: "Shipped via FedEx tracking #12345",
        }),
      })
    );
  });

  it("returns 400 when order has PENDING status", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
    } as never);

    const res = await PATCH(makeRequest({}), { params: paramsPromise });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only orders ready to ship can be shipped");
  });

  it("returns 400 when order has SHIPPED status", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "SHIPPED",
    } as never);

    const res = await PATCH(makeRequest({}), { params: paramsPromise });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only orders ready to ship can be shipped");
  });
});
