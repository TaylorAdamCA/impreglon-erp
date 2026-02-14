import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

vi.mock("@/lib/permissions");
import { hasPermission } from "@/lib/permissions";
const mockHasPermission = vi.mocked(hasPermission);

import { POST } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeRequest(body: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/shop/orders/order-1/assign-template"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

const paramsPromise = Promise.resolve({ id: "order-1" });

describe("POST /api/shop/orders/[id]/assign-template", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await POST(makeRequest({ templateId: "template-1" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when user lacks SHOP_PROCESS permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await POST(makeRequest({ templateId: "template-1" }), {
      params: paramsPromise,
    });

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

    const res = await POST(makeRequest({ templateId: "template-1" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Order not found");
  });

  it("returns 400 when order is not IN_PROGRESS", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
      processTemplate: null,
    } as never);

    const res = await POST(makeRequest({ templateId: "template-1" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe(
      "Only in-progress orders can be assigned templates"
    );
  });

  it("returns 400 for validation failure (missing templateId)", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
      processTemplate: null,
    } as never);

    const res = await POST(makeRequest({}), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toBeDefined();
  });

  it("returns 404 when template not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
      processTemplate: null,
    } as never);
    mockPrisma.processTemplate.findUnique.mockResolvedValueOnce(null);

    const res = await POST(makeRequest({ templateId: "template-999" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Template not found or inactive");
  });

  it("returns 404 when template is inactive", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
      processTemplate: null,
    } as never);
    mockPrisma.processTemplate.findUnique.mockResolvedValueOnce({
      id: "template-1",
      name: "Coating Process",
      isActive: false,
      steps: [],
    } as never);

    const res = await POST(makeRequest({ templateId: "template-1" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Template not found or inactive");
  });

  it("creates process steps from template and stores templateId on order", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
      processTemplate: null,
    } as never);
    mockPrisma.processTemplate.findUnique.mockResolvedValueOnce({
      id: "template-1",
      name: "Standard Coating",
      isActive: true,
      steps: [
        { id: "ts-1", stepNumber: 1, operationName: "Blast" },
        { id: "ts-2", stepNumber: 2, operationName: "Coat" },
        { id: "ts-3", stepNumber: 3, operationName: "Cure" },
      ],
    } as never);
    mockPrisma.orderProcessStep.deleteMany.mockResolvedValueOnce({
      count: 0,
    } as never);
    mockPrisma.orderProcessStep.create.mockResolvedValue({} as never);
    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
      processTemplate: "template-1",
      processSteps: [
        { id: "ops-1", stepNumber: 1, operationName: "Blast" },
        { id: "ops-2", stepNumber: 2, operationName: "Coat" },
        { id: "ops-3", stepNumber: 3, operationName: "Cure" },
      ],
    } as never);

    const res = await POST(makeRequest({ templateId: "template-1" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processTemplate).toBe("template-1");
    expect(body.processSteps).toHaveLength(3);

    // Verify deleteMany was called for reassignment cleanup
    expect(mockPrisma.orderProcessStep.deleteMany).toHaveBeenCalledWith({
      where: { orderId: "order-1" },
    });

    // Verify 3 process steps were created
    expect(mockPrisma.orderProcessStep.create).toHaveBeenCalledTimes(3);
    expect(mockPrisma.orderProcessStep.create).toHaveBeenCalledWith({
      data: {
        orderId: "order-1",
        templateStepId: "ts-1",
        stepNumber: 1,
        operationName: "Blast",
      },
    });
    expect(mockPrisma.orderProcessStep.create).toHaveBeenCalledWith({
      data: {
        orderId: "order-1",
        templateStepId: "ts-2",
        stepNumber: 2,
        operationName: "Coat",
      },
    });
    expect(mockPrisma.orderProcessStep.create).toHaveBeenCalledWith({
      data: {
        orderId: "order-1",
        templateStepId: "ts-3",
        stepNumber: 3,
        operationName: "Cure",
      },
    });

    // Verify order was updated with templateId
    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { processTemplate: "template-1" },
      include: {
        processSteps: { orderBy: { stepNumber: "asc" } },
      },
    });
  });

  it("reassignment deletes old steps and creates new ones", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
      processTemplate: "old-template",
    } as never);
    mockPrisma.processTemplate.findUnique.mockResolvedValueOnce({
      id: "template-2",
      name: "New Process",
      isActive: true,
      steps: [
        { id: "ts-new-1", stepNumber: 1, operationName: "New Step" },
      ],
    } as never);
    mockPrisma.orderProcessStep.deleteMany.mockResolvedValueOnce({
      count: 3,
    } as never);
    mockPrisma.orderProcessStep.create.mockResolvedValue({} as never);
    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
      processTemplate: "template-2",
      processSteps: [
        { id: "ops-new-1", stepNumber: 1, operationName: "New Step" },
      ],
    } as never);

    const res = await POST(makeRequest({ templateId: "template-2" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processTemplate).toBe("template-2");
    expect(body.processSteps).toHaveLength(1);

    // Old steps were deleted
    expect(mockPrisma.orderProcessStep.deleteMany).toHaveBeenCalledWith({
      where: { orderId: "order-1" },
    });

    // Only 1 new step was created
    expect(mockPrisma.orderProcessStep.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.orderProcessStep.create).toHaveBeenCalledWith({
      data: {
        orderId: "order-1",
        templateStepId: "ts-new-1",
        stepNumber: 1,
        operationName: "New Step",
      },
    });
  });
});
