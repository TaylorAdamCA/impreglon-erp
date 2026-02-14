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
    new URL("http://localhost:3000/api/shop/orders/order-1/process"),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

const paramsPromise = Promise.resolve({ id: "order-1" });

describe("PATCH /api/shop/orders/[id]/process", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PATCH(
      makeRequest({ stepId: "step-1", completed: true }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when user lacks SHOP_PROCESS permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await PATCH(
      makeRequest({ stepId: "step-1", completed: true }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
    expect(mockHasPermission).toHaveBeenCalledWith(
      "test-user-id",
      "SHOP_PROCESS"
    );
  });

  it("returns 404 when order not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);

    const res = await PATCH(
      makeRequest({ stepId: "step-1", completed: true }),
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
      makeRequest({ stepId: "step-1", completed: true }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe(
      "Only in-progress orders can have steps completed"
    );
  });

  it("returns 400 for validation failure (missing stepId)", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);

    const res = await PATCH(makeRequest({ completed: true }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toBeDefined();
  });

  it("returns 400 for validation failure (missing completed)", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);

    const res = await PATCH(makeRequest({ stepId: "step-1" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 404 when step not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);
    mockPrisma.orderProcessStep.findUnique.mockResolvedValueOnce(null);

    const res = await PATCH(
      makeRequest({ stepId: "step-999", completed: true }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Process step not found");
  });

  it("returns 404 when step belongs to a different order", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);
    mockPrisma.orderProcessStep.findUnique.mockResolvedValueOnce({
      id: "step-1",
      orderId: "order-other",
      stepNumber: 1,
    } as never);

    const res = await PATCH(
      makeRequest({ stepId: "step-1", completed: true }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Process step not found");
  });

  it("returns 400 when trying to complete step 2 before step 1", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);
    mockPrisma.orderProcessStep.findUnique.mockResolvedValueOnce({
      id: "step-2",
      orderId: "order-1",
      stepNumber: 2,
    } as never);
    // Simulate step 1 is incomplete
    mockPrisma.orderProcessStep.findMany.mockResolvedValueOnce([
      { id: "step-1", orderId: "order-1", stepNumber: 1, completedAt: null },
    ] as never);

    const res = await PATCH(
      makeRequest({ stepId: "step-2", completed: true }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Previous steps must be completed first");
  });

  it("allows completing step 1 without sequential check", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);
    mockPrisma.orderProcessStep.findUnique.mockResolvedValueOnce({
      id: "step-1",
      orderId: "order-1",
      stepNumber: 1,
    } as never);
    mockPrisma.orderProcessStep.update.mockResolvedValueOnce({
      id: "step-1",
      orderId: "order-1",
      stepNumber: 1,
      completedAt: new Date("2026-02-13T00:00:00Z"),
      completedById: "test-user-id",
      notes: null,
    } as never);

    const res = await PATCH(
      makeRequest({ stepId: "step-1", completed: true }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.completedAt).toBeDefined();
    expect(body.completedById).toBe("test-user-id");

    // No findMany call for sequential check on step 1
    expect(mockPrisma.orderProcessStep.findMany).not.toHaveBeenCalled();
  });

  it("completes step with completedAt and completedById set", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);
    mockPrisma.orderProcessStep.findUnique.mockResolvedValueOnce({
      id: "step-2",
      orderId: "order-1",
      stepNumber: 2,
    } as never);
    // All previous steps completed
    mockPrisma.orderProcessStep.findMany.mockResolvedValueOnce([]);
    mockPrisma.orderProcessStep.update.mockResolvedValueOnce({
      id: "step-2",
      orderId: "order-1",
      stepNumber: 2,
      completedAt: new Date("2026-02-13T00:00:00Z"),
      completedById: "test-user-id",
      notes: null,
    } as never);

    const res = await PATCH(
      makeRequest({ stepId: "step-2", completed: true }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.completedAt).toBeDefined();
    expect(body.completedById).toBe("test-user-id");

    const updateCall = mockPrisma.orderProcessStep.update.mock.calls[0][0];
    expect(updateCall).toEqual(
      expect.objectContaining({
        where: { id: "step-2" },
        data: expect.objectContaining({
          completedAt: expect.any(Date),
          completedById: "test-user-id",
          notes: null,
        }),
      })
    );
  });

  it("uncompletes step by clearing completedAt and completedById", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);
    mockPrisma.orderProcessStep.findUnique.mockResolvedValueOnce({
      id: "step-1",
      orderId: "order-1",
      stepNumber: 1,
    } as never);
    mockPrisma.orderProcessStep.update.mockResolvedValueOnce({
      id: "step-1",
      orderId: "order-1",
      stepNumber: 1,
      completedAt: null,
      completedById: null,
      notes: null,
    } as never);

    const res = await PATCH(
      makeRequest({ stepId: "step-1", completed: false }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.completedAt).toBeNull();
    expect(body.completedById).toBeNull();

    const updateCall = mockPrisma.orderProcessStep.update.mock.calls[0][0];
    expect(updateCall).toEqual(
      expect.objectContaining({
        where: { id: "step-1" },
        data: {
          completedAt: null,
          completedById: null,
          notes: null,
        },
      })
    );
  });

  it("includes notes when provided", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);
    mockPrisma.orderProcessStep.findUnique.mockResolvedValueOnce({
      id: "step-1",
      orderId: "order-1",
      stepNumber: 1,
    } as never);
    mockPrisma.orderProcessStep.update.mockResolvedValueOnce({
      id: "step-1",
      orderId: "order-1",
      stepNumber: 1,
      completedAt: new Date("2026-02-13T00:00:00Z"),
      completedById: "test-user-id",
      notes: "Blasted with 80 grit",
    } as never);

    const res = await PATCH(
      makeRequest({
        stepId: "step-1",
        completed: true,
        notes: "Blasted with 80 grit",
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notes).toBe("Blasted with 80 grit");

    const updateCall = mockPrisma.orderProcessStep.update.mock.calls[0][0];
    expect(updateCall).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          notes: "Blasted with 80 grit",
        }),
      })
    );
  });

  it("allows uncompleting step 2 without sequential check", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);
    mockPrisma.orderProcessStep.findUnique.mockResolvedValueOnce({
      id: "step-2",
      orderId: "order-1",
      stepNumber: 2,
    } as never);
    mockPrisma.orderProcessStep.update.mockResolvedValueOnce({
      id: "step-2",
      orderId: "order-1",
      stepNumber: 2,
      completedAt: null,
      completedById: null,
      notes: null,
    } as never);

    const res = await PATCH(
      makeRequest({ stepId: "step-2", completed: false }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    // No sequential check when uncompleting
    expect(mockPrisma.orderProcessStep.findMany).not.toHaveBeenCalled();
  });
});
