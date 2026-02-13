import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PUT, DELETE } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeRequest(method: string, body?: unknown) {
  return new NextRequest(
    new URL(
      "http://localhost:3000/api/orders/order-1/details/detail-1"
    ),
    {
      method,
      ...(body
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    }
  );
}

const paramsPromise = Promise.resolve({
  id: "order-1",
  detailId: "detail-1",
});

describe("PUT /api/orders/[id]/details/[detailId]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PUT(
      makeRequest("PUT", {
        description: "Updated",
        quantity: 1,
        unitPrice: 10,
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(401);
  });

  it("returns 404 when order not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);

    const res = await PUT(
      makeRequest("PUT", {
        description: "Updated",
        quantity: 1,
        unitPrice: 10,
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(404);
  });

  it("returns 400 when order not PENDING", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);

    const res = await PUT(
      makeRequest("PUT", {
        description: "Updated",
        quantity: 1,
        unitPrice: 10,
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only pending orders can be edited");
  });

  it("returns 400 for invalid data", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
    } as never);

    const res = await PUT(
      makeRequest("PUT", { quantity: 1 }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("updates detail and recalculates totals with GST", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
    } as never);
    mockPrisma.orderDetail.update.mockResolvedValueOnce({
      id: "detail-1",
      description: "Updated valve",
      quantity: 5,
      unitPrice: 20,
      lineTotal: 100,
    } as never);
    // recalculateOrderTotals mocks
    mockPrisma.orderDetail.findMany.mockResolvedValueOnce([
      { lineTotal: 100 },
      { lineTotal: 50 },
    ] as never);
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      gstRate: 5,
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({} as never);

    const res = await PUT(
      makeRequest("PUT", {
        description: "Updated valve",
        quantity: 5,
        unitPrice: 20,
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.description).toBe("Updated valve");

    expect(mockPrisma.orderDetail.update).toHaveBeenCalledWith({
      where: { id: "detail-1" },
      data: {
        description: "Updated valve",
        quantity: 5,
        unitPrice: 20,
        lineTotal: 100,
        coating: null,
      },
    });

    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { orderTotal: 150, gstAmount: 7.5 },
    });
  });

  it("updates coating field", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
    } as never);
    mockPrisma.orderDetail.update.mockResolvedValueOnce({
      id: "detail-1",
      description: "Coated part",
      quantity: 1,
      unitPrice: 100,
      lineTotal: 100,
      coating: "Chrome",
    } as never);
    // recalculateOrderTotals mocks
    mockPrisma.orderDetail.findMany.mockResolvedValueOnce([
      { lineTotal: 100 },
    ] as never);
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      gstRate: 5,
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({} as never);

    const res = await PUT(
      makeRequest("PUT", {
        description: "Coated part",
        quantity: 1,
        unitPrice: 100,
        coating: "Chrome",
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.orderDetail.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          coating: "Chrome",
        }),
      })
    );
  });

  it("calculates lineTotal correctly on update", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
    } as never);
    mockPrisma.orderDetail.update.mockResolvedValueOnce({
      id: "detail-1",
      lineTotal: 66.66,
    } as never);
    // recalculateOrderTotals mocks
    mockPrisma.orderDetail.findMany.mockResolvedValueOnce([
      { lineTotal: 66.66 },
    ] as never);
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      gstRate: 0,
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({} as never);

    await PUT(
      makeRequest("PUT", {
        description: "Item",
        quantity: 2,
        unitPrice: 33.33,
      }),
      { params: paramsPromise }
    );

    expect(mockPrisma.orderDetail.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lineTotal: 66.66,
        }),
      })
    );
  });
});

describe("DELETE /api/orders/[id]/details/[detailId]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await DELETE(makeRequest("DELETE"), {
      params: paramsPromise,
    });

    expect(res.status).toBe(401);
  });

  it("returns 404 when order not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);

    const res = await DELETE(makeRequest("DELETE"), {
      params: paramsPromise,
    });

    expect(res.status).toBe(404);
  });

  it("returns 400 when order not PENDING", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "COMPLETED",
    } as never);

    const res = await DELETE(makeRequest("DELETE"), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only pending orders can be edited");
  });

  it("returns 204 on successful delete and recalculates totals with GST", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
    } as never);
    mockPrisma.orderDetail.delete.mockResolvedValueOnce({} as never);
    // recalculateOrderTotals mocks
    mockPrisma.orderDetail.findMany.mockResolvedValueOnce([
      { lineTotal: 75 },
    ] as never);
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      gstRate: 10,
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({} as never);

    const res = await DELETE(makeRequest("DELETE"), {
      params: paramsPromise,
    });

    expect(res.status).toBe(204);
    expect(mockPrisma.orderDetail.delete).toHaveBeenCalledWith({
      where: { id: "detail-1" },
    });
    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { orderTotal: 75, gstAmount: 7.5 },
    });
  });

  it("recalculates to zero when all details deleted", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
    } as never);
    mockPrisma.orderDetail.delete.mockResolvedValueOnce({} as never);
    // recalculateOrderTotals mocks
    mockPrisma.orderDetail.findMany.mockResolvedValueOnce([] as never);
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      gstRate: 5,
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({} as never);

    const res = await DELETE(makeRequest("DELETE"), {
      params: paramsPromise,
    });

    expect(res.status).toBe(204);
    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { orderTotal: 0, gstAmount: 0 },
    });
  });
});
