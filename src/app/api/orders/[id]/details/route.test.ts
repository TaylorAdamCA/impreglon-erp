import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { POST } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeJsonRequest(body: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/orders/order-1/details"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

const paramsPromise = Promise.resolve({ id: "order-1" });

describe("POST /api/orders/[id]/details", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await POST(
      makeJsonRequest({ description: "Test", quantity: 1, unitPrice: 10 }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(401);
  });

  it("returns 404 when order not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);

    const res = await POST(
      makeJsonRequest({ description: "Test", quantity: 1, unitPrice: 10 }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(404);
  });

  it("returns 400 when order not PENDING", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);

    const res = await POST(
      makeJsonRequest({ description: "Test", quantity: 1, unitPrice: 10 }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only pending orders can be edited");
  });

  it("returns 400 for invalid data (missing description)", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
    } as never);

    const res = await POST(
      makeJsonRequest({ quantity: 1, unitPrice: 10 }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("creates detail with auto-incremented lineNumber", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
    } as never);
    mockPrisma.orderDetail.findFirst.mockResolvedValueOnce({
      lineNumber: 3,
    } as never);
    mockPrisma.orderDetail.create.mockResolvedValueOnce({
      id: "detail-new",
      lineNumber: 4,
      description: "Valve coating",
      quantity: 2,
      unitPrice: 50,
      lineTotal: 100,
    } as never);
    // recalculateOrderTotals mocks
    mockPrisma.orderDetail.findMany.mockResolvedValueOnce([
      { lineTotal: 100 },
    ] as never);
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      gstRate: 5,
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({} as never);

    const res = await POST(
      makeJsonRequest({
        description: "Valve coating",
        quantity: 2,
        unitPrice: 50,
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(201);
    expect(mockPrisma.orderDetail.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: "order-1",
          lineNumber: 4,
          description: "Valve coating",
          quantity: 2,
          unitPrice: 50,
          lineTotal: 100,
        }),
      })
    );
  });

  it("looks up coating price from library item when coatingSlot provided", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
    } as never);
    mockPrisma.orderDetail.findFirst.mockResolvedValueOnce(null);
    mockPrisma.productLibraryItem.findUnique.mockResolvedValueOnce({
      coatingPrice1: null,
      coatingPrice2: null,
      coatingPrice3: 75.5,
      coatingPrice4: null,
      coatingPrice5: null,
      coatingPrice6: null,
      coatingPrice7: null,
      coatingPrice8: null,
    } as never);
    mockPrisma.orderDetail.create.mockResolvedValueOnce({
      id: "detail-new",
      lineNumber: 1,
      description: "Coated valve",
      quantity: 4,
      unitPrice: 75.5,
      lineTotal: 302,
    } as never);
    // recalculateOrderTotals mocks
    mockPrisma.orderDetail.findMany.mockResolvedValueOnce([
      { lineTotal: 302 },
    ] as never);
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      gstRate: 5,
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({} as never);

    const res = await POST(
      makeJsonRequest({
        description: "Coated valve",
        quantity: 4,
        unitPrice: 0,
        libraryItemId: "item-1",
        coatingSlot: 3,
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(201);
    expect(mockPrisma.orderDetail.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          unitPrice: 75.5,
          lineTotal: 302,
        }),
      })
    );
  });

  it("calculates lineTotal correctly (quantity * unitPrice)", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
    } as never);
    mockPrisma.orderDetail.findFirst.mockResolvedValueOnce(null);
    mockPrisma.orderDetail.create.mockResolvedValueOnce({
      id: "detail-new",
      lineNumber: 1,
      description: "Fitting",
      quantity: 3,
      unitPrice: 33.33,
      lineTotal: 99.99,
    } as never);
    // recalculateOrderTotals mocks
    mockPrisma.orderDetail.findMany.mockResolvedValueOnce([
      { lineTotal: 99.99 },
    ] as never);
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      gstRate: 5,
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({} as never);

    await POST(
      makeJsonRequest({
        description: "Fitting",
        quantity: 3,
        unitPrice: 33.33,
      }),
      { params: paramsPromise }
    );

    expect(mockPrisma.orderDetail.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lineTotal: 99.99,
        }),
      })
    );
  });

  it("recalculates orderTotal and gstAmount after adding detail", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
    } as never);
    mockPrisma.orderDetail.findFirst.mockResolvedValueOnce(null);
    mockPrisma.orderDetail.create.mockResolvedValueOnce({
      id: "detail-new",
      lineNumber: 1,
    } as never);
    // recalculateOrderTotals mocks
    mockPrisma.orderDetail.findMany.mockResolvedValueOnce([
      { lineTotal: 100 },
      { lineTotal: 200.5 },
    ] as never);
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      gstRate: 5,
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({} as never);

    await POST(
      makeJsonRequest({
        description: "Test",
        quantity: 1,
        unitPrice: 100,
      }),
      { params: paramsPromise }
    );

    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { orderTotal: 300.5, gstAmount: 15.03 },
    });
  });

  it("stores coating field when provided", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
    } as never);
    mockPrisma.orderDetail.findFirst.mockResolvedValueOnce(null);
    mockPrisma.orderDetail.create.mockResolvedValueOnce({
      id: "detail-new",
      lineNumber: 1,
      coating: "Teflon",
    } as never);
    // recalculateOrderTotals mocks
    mockPrisma.orderDetail.findMany.mockResolvedValueOnce([
      { lineTotal: 50 },
    ] as never);
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      gstRate: 5,
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({} as never);

    const res = await POST(
      makeJsonRequest({
        description: "Coated part",
        quantity: 1,
        unitPrice: 50,
        coating: "Teflon",
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(201);
    expect(mockPrisma.orderDetail.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          coating: "Teflon",
        }),
      })
    );
  });

  it("sets coating to null when empty string", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
    } as never);
    mockPrisma.orderDetail.findFirst.mockResolvedValueOnce(null);
    mockPrisma.orderDetail.create.mockResolvedValueOnce({
      id: "detail-new",
      lineNumber: 1,
    } as never);
    // recalculateOrderTotals mocks
    mockPrisma.orderDetail.findMany.mockResolvedValueOnce([
      { lineTotal: 50 },
    ] as never);
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      gstRate: 0,
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({} as never);

    await POST(
      makeJsonRequest({
        description: "Part",
        quantity: 1,
        unitPrice: 50,
        coating: "",
      }),
      { params: paramsPromise }
    );

    expect(mockPrisma.orderDetail.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          coating: null,
        }),
      })
    );
  });
});
