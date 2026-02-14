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
    new URL(
      "http://localhost:3000/api/qa/orders/order-1/rework/rework-1"
    ),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

const paramsPromise = Promise.resolve({ id: "order-1", reworkId: "rework-1" });

describe("PATCH /api/qa/orders/[id]/rework/[reworkId]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PATCH(makeRequest({ action: "start" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when user lacks QA_MANAGE permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await PATCH(makeRequest({ action: "start" }), {
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

  it("returns 404 when rework item not found", async () => {
    mockPrisma.rework.findUnique.mockResolvedValueOnce(null);

    const res = await PATCH(makeRequest({ action: "start" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Rework item not found");
  });

  it("returns 404 when rework item belongs to a different order", async () => {
    mockPrisma.rework.findUnique.mockResolvedValueOnce({
      id: "rework-1",
      orderId: "order-other",
      status: "PLAN_CREATED",
    } as never);

    const res = await PATCH(makeRequest({ action: "start" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Rework item not found");
  });

  it("returns 400 for invalid action", async () => {
    mockPrisma.rework.findUnique.mockResolvedValueOnce({
      id: "rework-1",
      orderId: "order-1",
      status: "FLAGGED",
    } as never);

    const res = await PATCH(makeRequest({ action: "invalid" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toBeDefined();
  });

  describe("start action", () => {
    it("returns 400 when rework is not PLAN_CREATED", async () => {
      mockPrisma.rework.findUnique.mockResolvedValueOnce({
        id: "rework-1",
        orderId: "order-1",
        status: "FLAGGED",
      } as never);

      const res = await PATCH(makeRequest({ action: "start" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe(
        "Only rework items with plans can be started"
      );
    });

    it("returns 200 and transitions to IN_PROGRESS", async () => {
      mockPrisma.rework.findUnique.mockResolvedValueOnce({
        id: "rework-1",
        orderId: "order-1",
        status: "PLAN_CREATED",
      } as never);
      mockPrisma.rework.update.mockResolvedValueOnce({
        id: "rework-1",
        orderId: "order-1",
        status: "IN_PROGRESS",
      } as never);

      const res = await PATCH(makeRequest({ action: "start" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("IN_PROGRESS");

      expect(mockPrisma.rework.update).toHaveBeenCalledWith({
        where: { id: "rework-1" },
        data: { status: "IN_PROGRESS" },
      });
    });
  });

  describe("resolve action", () => {
    it("returns 400 when rework is not IN_PROGRESS", async () => {
      mockPrisma.rework.findUnique.mockResolvedValueOnce({
        id: "rework-1",
        orderId: "order-1",
        status: "PLAN_CREATED",
      } as never);

      const res = await PATCH(makeRequest({ action: "resolve" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe(
        "Only in-progress rework items can be resolved"
      );
    });

    it("returns 200 and transitions to RESOLVED with resolved=true and resolvedAt", async () => {
      const now = new Date("2026-02-14T12:00:00Z");
      vi.setSystemTime(now);

      mockPrisma.rework.findUnique.mockResolvedValueOnce({
        id: "rework-1",
        orderId: "order-1",
        status: "IN_PROGRESS",
      } as never);
      mockPrisma.rework.update.mockResolvedValueOnce({
        id: "rework-1",
        orderId: "order-1",
        status: "RESOLVED",
        resolved: true,
        resolvedAt: now,
      } as never);

      const res = await PATCH(makeRequest({ action: "resolve" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("RESOLVED");
      expect(body.resolved).toBe(true);
      expect(body.resolvedAt).toBeDefined();

      expect(mockPrisma.rework.update).toHaveBeenCalledWith({
        where: { id: "rework-1" },
        data: {
          status: "RESOLVED",
          resolved: true,
          resolvedAt: now,
        },
      });

      vi.useRealTimers();
    });
  });
});
