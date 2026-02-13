import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { GET, POST } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

function makeJsonRequest(url: string, body: unknown) {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/orders", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await GET(makeRequest("/api/orders"));

    expect(res.status).toBe(401);
  });

  it("returns paginated orders", async () => {
    const mockOrders = [
      { id: "1", orderNo: 1, customer: { company: "Acme" }, createdBy: { username: "admin" } },
      { id: "2", orderNo: 2, customer: { company: "Beta Corp" }, createdBy: { username: "admin" } },
    ];
    mockPrisma.order.findMany.mockResolvedValueOnce(mockOrders as never);
    mockPrisma.order.count.mockResolvedValueOnce(2);

    const res = await GET(makeRequest("/api/orders"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.orders).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(20);
  });

  it("filters by status when provided", async () => {
    mockPrisma.order.findMany.mockResolvedValueOnce([]);
    mockPrisma.order.count.mockResolvedValueOnce(0);

    await GET(makeRequest("/api/orders?status=PENDING"));

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "PENDING" }),
      })
    );
  });

  it("ignores invalid status values", async () => {
    mockPrisma.order.findMany.mockResolvedValueOnce([]);
    mockPrisma.order.count.mockResolvedValueOnce(0);

    await GET(makeRequest("/api/orders?status=INVALID"));

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      })
    );
  });

  it("applies search filter on customer company name", async () => {
    mockPrisma.order.findMany.mockResolvedValueOnce([]);
    mockPrisma.order.count.mockResolvedValueOnce(0);

    await GET(makeRequest("/api/orders?search=acme"));

    const call = mockPrisma.order.findMany.mock.calls[0][0] as {
      where: { OR?: unknown[] };
    };
    expect(call.where.OR).toBeDefined();
    // customer company + poNumber (non-numeric, so no orderNo)
    expect(call.where.OR).toHaveLength(2);
  });

  it("includes orderNo in search when numeric", async () => {
    mockPrisma.order.findMany.mockResolvedValueOnce([]);
    mockPrisma.order.count.mockResolvedValueOnce(0);

    await GET(makeRequest("/api/orders?search=42"));

    const call = mockPrisma.order.findMany.mock.calls[0][0] as {
      where: { OR?: unknown[] };
    };
    // customer company + poNumber + orderNo
    expect(call.where.OR).toHaveLength(3);
  });

  it("applies pagination correctly", async () => {
    mockPrisma.order.findMany.mockResolvedValueOnce([]);
    mockPrisma.order.count.mockResolvedValueOnce(0);

    await GET(makeRequest("/api/orders?page=3&pageSize=10"));

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      })
    );
  });

  it("orders by orderDate descending", async () => {
    mockPrisma.order.findMany.mockResolvedValueOnce([]);
    mockPrisma.order.count.mockResolvedValueOnce(0);

    await GET(makeRequest("/api/orders"));

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { orderDate: "desc" },
      })
    );
  });
});

describe("POST /api/orders", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await POST(
      makeJsonRequest("/api/orders", { customerId: "cust-1" })
    );

    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid data", async () => {
    const res = await POST(makeJsonRequest("/api/orders", {}));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("creates order with auto-incremented orderNo", async () => {
    mockPrisma.order.findFirst.mockResolvedValueOnce({
      orderNo: 42,
    } as never);
    mockPrisma.order.create.mockResolvedValueOnce({
      id: "new-order-id",
      orderNo: 43,
      customerId: "cust-1",
    } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

    const res = await POST(
      makeJsonRequest("/api/orders", { customerId: "cust-1" })
    );

    expect(res.status).toBe(201);
    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderNo: 43,
          customerId: "cust-1",
          createdById: "test-user-id",
        }),
      })
    );
  });

  it("starts at orderNo 1 when no existing orders", async () => {
    mockPrisma.order.findFirst.mockResolvedValueOnce(null);
    mockPrisma.order.create.mockResolvedValueOnce({
      id: "first-id",
      orderNo: 1,
      customerId: "cust-1",
    } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

    await POST(
      makeJsonRequest("/api/orders", { customerId: "cust-1" })
    );

    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orderNo: 1 }),
      })
    );
  });

  it("sets gstAmount to 0 and stores gstRate", async () => {
    mockPrisma.order.findFirst.mockResolvedValueOnce(null);
    mockPrisma.order.create.mockResolvedValueOnce({
      id: "gst-id",
      orderNo: 1,
      customerId: "cust-1",
      gstAmount: 0,
      gstRate: 5,
    } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

    await POST(
      makeJsonRequest("/api/orders", { customerId: "cust-1", gstRate: 5 })
    );

    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          gstAmount: 0,
          gstRate: 5,
        }),
      })
    );
  });

  it("creates initial OrderStatusHistory record", async () => {
    mockPrisma.order.findFirst.mockResolvedValueOnce(null);
    mockPrisma.order.create.mockResolvedValueOnce({
      id: "history-order-id",
      orderNo: 1,
      customerId: "cust-1",
    } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

    await POST(
      makeJsonRequest("/api/orders", { customerId: "cust-1" })
    );

    expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith({
      data: {
        orderId: "history-order-id",
        fromStatus: null,
        toStatus: "PENDING",
        changedById: "test-user-id",
      },
    });
  });

  it("includes poNumber, shipDate, and dueDate when provided", async () => {
    mockPrisma.order.findFirst.mockResolvedValueOnce(null);
    mockPrisma.order.create.mockResolvedValueOnce({
      id: "full-id",
      orderNo: 1,
      customerId: "cust-1",
    } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

    await POST(
      makeJsonRequest("/api/orders", {
        customerId: "cust-1",
        poNumber: "PO-123",
        shipDate: "2026-03-01",
        dueDate: "2026-03-15",
      })
    );

    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          poNumber: "PO-123",
          shipDate: new Date("2026-03-01"),
          dueDate: new Date("2026-03-15"),
        }),
      })
    );
  });
});
