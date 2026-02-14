import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PATCH } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeRequest(body: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/orders/order-1/status"),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

const paramsPromise = Promise.resolve({ id: "order-1" });

describe("PATCH /api/orders/[id]/status", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PATCH(makeRequest({ action: "start" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(401);
  });

  it("returns 404 when order not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);

    const res = await PATCH(makeRequest({ action: "start" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Order not found");
  });

  it("returns 400 for invalid action value", async () => {
    const res = await PATCH(makeRequest({ action: "cancel" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  describe("start", () => {
    it("returns 400 when order is not PENDING", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "IN_PROGRESS",
      } as never);

      const res = await PATCH(makeRequest({ action: "start" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Only pending orders can be started");
    });

    it("returns 400 when order has no line items", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "PENDING",
      } as never);
      mockPrisma.orderDetail.count.mockResolvedValueOnce(0);

      const res = await PATCH(makeRequest({ action: "start" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Cannot start an order with no line items");
    });

    it("transitions PENDING -> IN_PROGRESS when order has details", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "PENDING",
      } as never);
      mockPrisma.orderDetail.count.mockResolvedValueOnce(3);
      mockPrisma.order.update.mockResolvedValueOnce({
        id: "order-1",
        status: "IN_PROGRESS",
      } as never);
      mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

      const res = await PATCH(makeRequest({ action: "start" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("IN_PROGRESS");
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: "order-1" },
        data: { status: "IN_PROGRESS" },
      });
    });

    it("creates history record with correct data on start", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "PENDING",
      } as never);
      mockPrisma.orderDetail.count.mockResolvedValueOnce(2);
      mockPrisma.order.update.mockResolvedValueOnce({
        id: "order-1",
        status: "IN_PROGRESS",
      } as never);
      mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

      await PATCH(makeRequest({ action: "start" }), {
        params: paramsPromise,
      });

      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: "order-1",
          fromStatus: "PENDING",
          toStatus: "IN_PROGRESS",
          changedById: "test-user-id",
          notes: null,
        },
      });
    });

    it("includes notes in history record when provided", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "PENDING",
      } as never);
      mockPrisma.orderDetail.count.mockResolvedValueOnce(1);
      mockPrisma.order.update.mockResolvedValueOnce({
        id: "order-1",
        status: "IN_PROGRESS",
      } as never);
      mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

      await PATCH(
        makeRequest({ action: "start", notes: "Starting production" }),
        { params: paramsPromise }
      );

      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: "order-1",
          fromStatus: "PENDING",
          toStatus: "IN_PROGRESS",
          changedById: "test-user-id",
          notes: "Starting production",
        },
      });
    });
  });

  describe("ready", () => {
    it("returns 400 when order is not IN_PROGRESS", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "PENDING",
      } as never);

      const res = await PATCH(makeRequest({ action: "ready" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Only in-progress orders can be marked ready to ship");
    });

    it("transitions IN_PROGRESS -> READY_TO_SHIP", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "IN_PROGRESS",
      } as never);
      mockPrisma.order.update.mockResolvedValueOnce({
        id: "order-1",
        status: "READY_TO_SHIP",
      } as never);
      mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

      const res = await PATCH(makeRequest({ action: "ready" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("READY_TO_SHIP");
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: "order-1" },
        data: { status: "READY_TO_SHIP" },
      });
    });

    it("creates history record with correct data on ready", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "IN_PROGRESS",
      } as never);
      mockPrisma.order.update.mockResolvedValueOnce({
        id: "order-1",
        status: "READY_TO_SHIP",
      } as never);
      mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

      await PATCH(
        makeRequest({ action: "ready", notes: "All processes complete" }),
        { params: paramsPromise }
      );

      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: "order-1",
          fromStatus: "IN_PROGRESS",
          toStatus: "READY_TO_SHIP",
          changedById: "test-user-id",
          notes: "All processes complete",
        },
      });
    });
  });

  describe("complete", () => {
    it("returns 400 when order is not IN_PROGRESS", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "PENDING",
      } as never);

      const res = await PATCH(makeRequest({ action: "complete" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Only in-progress orders can be completed");
    });

    it("transitions IN_PROGRESS -> READY_TO_SHIP", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "IN_PROGRESS",
      } as never);
      mockPrisma.order.update.mockResolvedValueOnce({
        id: "order-1",
        status: "READY_TO_SHIP",
      } as never);
      mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

      const res = await PATCH(makeRequest({ action: "complete" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("READY_TO_SHIP");
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: "order-1" },
        data: { status: "READY_TO_SHIP" },
      });
    });

    it("creates history record with correct data on complete", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "IN_PROGRESS",
      } as never);
      mockPrisma.order.update.mockResolvedValueOnce({
        id: "order-1",
        status: "READY_TO_SHIP",
      } as never);
      mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

      await PATCH(
        makeRequest({ action: "complete", notes: "All items coated" }),
        { params: paramsPromise }
      );

      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: "order-1",
          fromStatus: "IN_PROGRESS",
          toStatus: "READY_TO_SHIP",
          changedById: "test-user-id",
          notes: "All items coated",
        },
      });
    });
  });
});
