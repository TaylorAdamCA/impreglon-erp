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

import { PUT } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

const paramsPromise = Promise.resolve({ id: "order-1" });

function makeRequest(body: unknown = {}) {
  return new NextRequest(
    new URL("http://localhost:3000/api/invoices/order-1/modify"),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

describe("PUT /api/invoices/[id]/modify", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await PUT(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user lacks invoice_modify permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    const res = await PUT(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(403);
  });

  it("returns 404 when order not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);
    const res = await PUT(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(404);
  });

  it("returns 400 when order is not in draft/modified status", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "SHIPPED",
    } as never);

    const res = await PUT(makeRequest({ notes: "test" }), {
      params: paramsPromise,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe(
      "Only draft or modified invoices can be modified"
    );
  });

  it("modifies a DRAFT_INVOICE successfully", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "DRAFT_INVOICE",
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
      status: "INVOICE_MODIFIED",
      invoiceNotes: "Updated notes",
    } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

    const res = await PUT(makeRequest({ notes: "Updated notes" }), {
      params: paramsPromise,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("INVOICE_MODIFIED");
  });

  it("modifies an INVOICE_MODIFIED successfully", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "INVOICE_MODIFIED",
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
      status: "INVOICE_MODIFIED",
      gstAmount: 150.0,
    } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

    const res = await PUT(makeRequest({ gstOverride: 150.0 }), {
      params: paramsPromise,
    });
    expect(res.status).toBe(200);
  });

  it("updates GST amount when gstOverride provided", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "DRAFT_INVOICE",
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
      status: "INVOICE_MODIFIED",
    } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

    await PUT(makeRequest({ gstOverride: 99.99 }), {
      params: paramsPromise,
    });

    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ gstAmount: 99.99 }),
      })
    );
  });

  it("creates status history record", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "DRAFT_INVOICE",
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
      status: "INVOICE_MODIFIED",
    } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

    await PUT(makeRequest({ notes: "Fixed total" }), {
      params: paramsPromise,
    });

    expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith({
      data: {
        orderId: "order-1",
        fromStatus: "DRAFT_INVOICE",
        toStatus: "INVOICE_MODIFIED",
        changedById: "test-user-id",
        notes: "Fixed total",
      },
    });
  });
});
