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

import { POST } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

const paramsPromise = Promise.resolve({ id: "order-1" });

function makeRequest(body: unknown = {}) {
  return new NextRequest(
    new URL("http://localhost:3000/api/invoices/order-1/draft"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

describe("POST /api/invoices/[id]/draft", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user lacks invoice_draft permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    const res = await POST(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(403);
    expect(mockHasPermission).toHaveBeenCalledWith("test-user-id", "invoice_draft");
  });

  it("returns 404 when order not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(404);
  });

  it("returns 400 when order is not SHIPPED", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "IN_PROGRESS",
      orderDate: new Date("2024-06-01"),
      orderTotal: 5000,
    } as never);

    const res = await POST(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only shipped orders can be invoiced");
  });

  it("creates draft invoice with auto-calculated GST", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "SHIPPED",
      orderDate: new Date("2024-06-01"),
      orderTotal: 5000,
    } as never);

    // Max invoiceNo lookup
    mockPrisma.order.findFirst.mockResolvedValueOnce({
      invoiceNo: 42,
    } as never);

    // Tax rate lookup
    mockPrisma.taxRate.findFirst.mockResolvedValueOnce({
      id: "rate-1",
      rate: 1.0,
    } as never);

    // Order update
    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
      status: "DRAFT_INVOICE",
      invoiceNo: 43,
      gstRate: 1.0,
      gstAmount: 50.0,
    } as never);

    // Status history
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

    const res = await POST(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoiceNo).toBe(43);
    expect(body.status).toBe("DRAFT_INVOICE");

    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order-1" },
        data: expect.objectContaining({
          status: "DRAFT_INVOICE",
          invoiceNo: 43,
          gstRate: 1.0,
        }),
      })
    );
  });

  it("uses invoiceNo 1 when no existing invoices", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "SHIPPED",
      orderDate: new Date("2024-06-01"),
      orderTotal: 5000,
    } as never);

    mockPrisma.order.findFirst.mockResolvedValueOnce(null);
    mockPrisma.taxRate.findFirst.mockResolvedValueOnce({
      id: "rate-1",
      rate: 1.0,
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
      invoiceNo: 1,
      status: "DRAFT_INVOICE",
    } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

    const res = await POST(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(200);

    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ invoiceNo: 1 }),
      })
    );
  });

  it("allows GST override", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "SHIPPED",
      orderDate: new Date("2024-06-01"),
      orderTotal: 5000,
    } as never);

    mockPrisma.order.findFirst.mockResolvedValueOnce({ invoiceNo: 10 } as never);
    mockPrisma.taxRate.findFirst.mockResolvedValueOnce({
      id: "rate-1",
      rate: 1.0,
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
      invoiceNo: 11,
      status: "DRAFT_INVOICE",
      gstAmount: 200.0,
    } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

    const res = await POST(makeRequest({ gstOverride: 200.0 }), {
      params: paramsPromise,
    });
    expect(res.status).toBe(200);

    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ gstAmount: 200.0 }),
      })
    );
  });

  it("creates status history record", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "SHIPPED",
      orderDate: new Date("2024-06-01"),
      orderTotal: 5000,
    } as never);
    mockPrisma.order.findFirst.mockResolvedValueOnce(null);
    mockPrisma.taxRate.findFirst.mockResolvedValueOnce({ rate: 1.0 } as never);
    mockPrisma.order.update.mockResolvedValueOnce({ id: "order-1" } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

    await POST(makeRequest({ notes: "Rush" }), { params: paramsPromise });

    expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith({
      data: {
        orderId: "order-1",
        fromStatus: "SHIPPED",
        toStatus: "DRAFT_INVOICE",
        changedById: "test-user-id",
        notes: "Rush",
      },
    });
  });

  it("defaults GST to 0 when no tax rate found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "SHIPPED",
      orderDate: new Date("2024-06-01"),
      orderTotal: 5000,
    } as never);
    mockPrisma.order.findFirst.mockResolvedValueOnce(null);
    mockPrisma.taxRate.findFirst.mockResolvedValueOnce(null);
    mockPrisma.order.update.mockResolvedValueOnce({ id: "order-1" } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

    const res = await POST(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(200);

    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ gstRate: 0, gstAmount: 0 }),
      })
    );
  });
});
