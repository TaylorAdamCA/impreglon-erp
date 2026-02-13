import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { GET, PUT, DELETE } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeRequest(method: string, body?: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/orders/order-1"),
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

const paramsPromise = Promise.resolve({ id: "order-1" });

describe("GET /api/orders/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await GET(makeRequest("GET"), { params: paramsPromise });

    expect(res.status).toBe(401);
  });

  it("returns 404 when order not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);

    const res = await GET(makeRequest("GET"), { params: paramsPromise });

    expect(res.status).toBe(404);
  });

  it("returns order with includes", async () => {
    const mockOrder = {
      id: "order-1",
      orderNo: 1001,
      status: "PENDING",
      customer: { id: "cust-1", company: "Acme Corp" },
      createdBy: { username: "testuser" },
      details: [
        { id: "detail-1", lineNumber: 1, description: "Valve coating" },
      ],
      statusHistory: [
        {
          id: "hist-1",
          toStatus: "PENDING",
          changedAt: "2026-01-01T00:00:00Z",
          changedBy: { username: "testuser" },
        },
      ],
    };
    mockPrisma.order.findUnique.mockResolvedValueOnce(mockOrder as never);

    const res = await GET(makeRequest("GET"), { params: paramsPromise });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.orderNo).toBe(1001);
    expect(body.customer.id).toBe("cust-1");
    expect(body.customer.company).toBe("Acme Corp");
    expect(body.createdBy.username).toBe("testuser");
    expect(body.details).toHaveLength(1);
    expect(body.statusHistory).toHaveLength(1);
    expect(body.statusHistory[0].changedBy.username).toBe("testuser");
  });

  it("queries with correct includes and ordering", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);

    await GET(makeRequest("GET"), { params: paramsPromise });

    expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
      where: { id: "order-1" },
      include: {
        customer: { select: { id: true, company: true } },
        createdBy: { select: { username: true } },
        details: { orderBy: { lineNumber: "asc" } },
        statusHistory: {
          orderBy: { changedAt: "desc" },
          include: { changedBy: { select: { username: true } } },
        },
      },
    });
  });
});

describe("PUT /api/orders/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PUT(
      makeRequest("PUT", { customerId: "cust-2" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(401);
  });

  it("returns 404 when order not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);

    const res = await PUT(
      makeRequest("PUT", { customerId: "cust-2" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(404);
  });

  it("returns 400 when order is not PENDING", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);

    const res = await PUT(
      makeRequest("PUT", { customerId: "cust-2" }),
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

    const res = await PUT(makeRequest("PUT", {}), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("updates order successfully when PENDING", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
      gstRate: 5,
      orderTotal: 1000,
    } as never);

    const updated = {
      id: "order-1",
      customerId: "cust-2",
      status: "PENDING",
      poNumber: "PO-456",
      gstRate: 5,
    };
    mockPrisma.order.update.mockResolvedValueOnce(updated as never);

    const res = await PUT(
      makeRequest("PUT", {
        customerId: "cust-2",
        poNumber: "PO-456",
        gstRate: 5,
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.customerId).toBe("cust-2");
    expect(body.poNumber).toBe("PO-456");
  });

  it("recalculates gstAmount when gstRate changes", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
      gstRate: 5,
      orderTotal: 1000,
    } as never);

    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
      gstRate: 10,
      gstAmount: 100,
    } as never);

    const res = await PUT(
      makeRequest("PUT", { customerId: "cust-1", gstRate: 10 }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          gstRate: 10,
          gstAmount: 100,
        }),
      })
    );
  });

  it("does not recalculate gstAmount when gstRate is unchanged", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
      gstRate: 5,
      orderTotal: 1000,
    } as never);

    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
      gstRate: 5,
    } as never);

    await PUT(
      makeRequest("PUT", { customerId: "cust-1", gstRate: 5 }),
      { params: paramsPromise }
    );

    const updateCall = mockPrisma.order.update.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(updateCall.data.gstAmount).toBeUndefined();
  });

  it("handles decimal gstRate and orderTotal correctly", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
      gstRate: 5,
      orderTotal: 1234.56,
    } as never);

    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
      gstRate: 7.5,
      gstAmount: 92.59,
    } as never);

    await PUT(
      makeRequest("PUT", { customerId: "cust-1", gstRate: 7.5 }),
      { params: paramsPromise }
    );

    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          gstRate: 7.5,
          gstAmount: 92.59,
        }),
      })
    );
  });

  it("converts shipDate and dueDate to Date objects", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
      gstRate: 5,
      orderTotal: 0,
    } as never);

    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
    } as never);

    await PUT(
      makeRequest("PUT", {
        customerId: "cust-1",
        shipDate: "2026-03-01",
        dueDate: "2026-03-15",
        gstRate: 5,
      }),
      { params: paramsPromise }
    );

    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shipDate: new Date("2026-03-01"),
          dueDate: new Date("2026-03-15"),
        }),
      })
    );
  });

  it("sets poNumber to null when empty string", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
      gstRate: 5,
      orderTotal: 0,
    } as never);

    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
    } as never);

    await PUT(
      makeRequest("PUT", {
        customerId: "cust-1",
        poNumber: "",
        gstRate: 5,
      }),
      { params: paramsPromise }
    );

    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          poNumber: null,
        }),
      })
    );
  });
});

describe("DELETE /api/orders/[id]", () => {
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

  it("returns 400 when order is not PENDING", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
    } as never);

    const res = await DELETE(makeRequest("DELETE"), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only pending orders can be deleted");
  });

  it("returns 204 on successful delete", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "PENDING",
    } as never);
    mockPrisma.order.delete.mockResolvedValueOnce({} as never);

    const res = await DELETE(makeRequest("DELETE"), {
      params: paramsPromise,
    });

    expect(res.status).toBe(204);
    expect(mockPrisma.order.delete).toHaveBeenCalledWith({
      where: { id: "order-1" },
    });
  });
});
