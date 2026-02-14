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
    new URL("http://localhost:3000/api/qa/orders/order-1/status"),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

const paramsPromise = Promise.resolve({ id: "order-1" });

describe("PATCH /api/qa/orders/[id]/status", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PATCH(makeRequest({ action: "pass" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when user lacks QA_MANAGE permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await PATCH(makeRequest({ action: "pass" }), {
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

  it("returns 400 for validation failure (invalid action)", async () => {
    const res = await PATCH(makeRequest({ action: "invalid" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toBeDefined();
  });

  it("returns 404 when order not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);

    const res = await PATCH(makeRequest({ action: "pass" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Order not found");
  });

  describe("rework action", () => {
    it("returns 400 when order is not IN_PROGRESS", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "PENDING",
        details: [],
        reworkItems: [],
      } as never);

      const res = await PATCH(makeRequest({ action: "rework" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Only in-progress orders can be sent to rework");
    });

    it("returns 400 when no unresolved rework items exist", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "IN_PROGRESS",
        details: [{ quantity: 10, passedQty: 5, reworkQty: 0 }],
        reworkItems: [{ resolved: true }],
      } as never);

      const res = await PATCH(makeRequest({ action: "rework" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("No unresolved rework items exist");
    });

    it("returns 400 when rework items array is empty", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "IN_PROGRESS",
        details: [{ quantity: 10, passedQty: 5, reworkQty: 0 }],
        reworkItems: [],
      } as never);

      const res = await PATCH(makeRequest({ action: "rework" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("No unresolved rework items exist");
    });

    it("transitions IN_PROGRESS -> REWORK and creates history", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "IN_PROGRESS",
        details: [{ quantity: 10, passedQty: 5, reworkQty: 3 }],
        reworkItems: [{ resolved: false }],
      } as never);
      mockPrisma.order.update.mockResolvedValueOnce({
        id: "order-1",
        status: "REWORK",
      } as never);
      mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

      const res = await PATCH(
        makeRequest({ action: "rework", notes: "Coating defects found" }),
        { params: paramsPromise }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("REWORK");

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: "order-1" },
        data: { status: "REWORK" },
      });

      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: "order-1",
          fromStatus: "IN_PROGRESS",
          toStatus: "REWORK",
          changedById: "test-user-id",
          notes: "Coating defects found",
        },
      });
    });

    it("sets notes to null when not provided", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "IN_PROGRESS",
        details: [{ quantity: 10, passedQty: 5, reworkQty: 3 }],
        reworkItems: [{ resolved: false }],
      } as never);
      mockPrisma.order.update.mockResolvedValueOnce({
        id: "order-1",
        status: "REWORK",
      } as never);
      mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

      await PATCH(makeRequest({ action: "rework" }), {
        params: paramsPromise,
      });

      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: "order-1",
          fromStatus: "IN_PROGRESS",
          toStatus: "REWORK",
          changedById: "test-user-id",
          notes: null,
        },
      });
    });
  });

  describe("pass action", () => {
    it("returns 400 when order is not IN_PROGRESS", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "REWORK",
        details: [],
        reworkItems: [],
      } as never);

      const res = await PATCH(makeRequest({ action: "pass" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Only in-progress orders can pass QA");
    });

    it("returns 400 when not all items have passed inspection", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "IN_PROGRESS",
        details: [
          { quantity: 10, passedQty: 10, reworkQty: 0 },
          { quantity: 5, passedQty: 3, reworkQty: 0 },
        ],
        reworkItems: [],
      } as never);

      const res = await PATCH(makeRequest({ action: "pass" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Not all items have passed inspection");
    });

    it("transitions IN_PROGRESS -> READY_TO_SHIP and creates history", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "IN_PROGRESS",
        details: [
          { quantity: 10, passedQty: 10, reworkQty: 0 },
          { quantity: 5, passedQty: 5, reworkQty: 0 },
        ],
        reworkItems: [],
      } as never);
      mockPrisma.order.update.mockResolvedValueOnce({
        id: "order-1",
        status: "READY_TO_SHIP",
      } as never);
      mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

      const res = await PATCH(
        makeRequest({ action: "pass", notes: "All items inspected and approved" }),
        { params: paramsPromise }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("READY_TO_SHIP");

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: "order-1" },
        data: { status: "READY_TO_SHIP" },
      });

      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: "order-1",
          fromStatus: "IN_PROGRESS",
          toStatus: "READY_TO_SHIP",
          changedById: "test-user-id",
          notes: "All items inspected and approved",
        },
      });
    });

    it("passes when passedQty exceeds quantity", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "IN_PROGRESS",
        details: [{ quantity: 10, passedQty: 12, reworkQty: 0 }],
        reworkItems: [],
      } as never);
      mockPrisma.order.update.mockResolvedValueOnce({
        id: "order-1",
        status: "READY_TO_SHIP",
      } as never);
      mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

      const res = await PATCH(makeRequest({ action: "pass" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("READY_TO_SHIP");
    });
  });

  describe("return action", () => {
    it("returns 400 when order is not REWORK", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "IN_PROGRESS",
        details: [],
        reworkItems: [],
      } as never);

      const res = await PATCH(makeRequest({ action: "return" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Only rework orders can be returned to QA");
    });

    it("returns 400 when not all rework items are resolved", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "REWORK",
        details: [{ quantity: 10, passedQty: 5, reworkQty: 3 }],
        reworkItems: [{ resolved: true }, { resolved: false }],
      } as never);

      const res = await PATCH(makeRequest({ action: "return" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Not all rework items are resolved");
    });

    it("transitions REWORK -> IN_PROGRESS and creates history", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "REWORK",
        details: [{ quantity: 10, passedQty: 5, reworkQty: 3 }],
        reworkItems: [{ resolved: true }, { resolved: true }],
      } as never);
      mockPrisma.order.update.mockResolvedValueOnce({
        id: "order-1",
        status: "IN_PROGRESS",
      } as never);
      mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

      const res = await PATCH(
        makeRequest({ action: "return", notes: "Rework completed, re-inspect" }),
        { params: paramsPromise }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("IN_PROGRESS");

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: "order-1" },
        data: { status: "IN_PROGRESS" },
      });

      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: "order-1",
          fromStatus: "REWORK",
          toStatus: "IN_PROGRESS",
          changedById: "test-user-id",
          notes: "Rework completed, re-inspect",
        },
      });
    });

    it("sets notes to null when not provided", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        status: "REWORK",
        details: [{ quantity: 10, passedQty: 5, reworkQty: 3 }],
        reworkItems: [{ resolved: true }],
      } as never);
      mockPrisma.order.update.mockResolvedValueOnce({
        id: "order-1",
        status: "IN_PROGRESS",
      } as never);
      mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

      await PATCH(makeRequest({ action: "return" }), {
        params: paramsPromise,
      });

      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: "order-1",
          fromStatus: "REWORK",
          toStatus: "IN_PROGRESS",
          changedById: "test-user-id",
          notes: null,
        },
      });
    });
  });
});
