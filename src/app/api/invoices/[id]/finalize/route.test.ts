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
    new URL("http://localhost:3000/api/invoices/order-1/finalize"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

describe("POST /api/invoices/[id]/finalize", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user lacks invoice_finalize permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    const res = await POST(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(403);
  });

  it("returns 404 when order not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ confirm: true }), { params: paramsPromise });
    expect(res.status).toBe(404);
  });

  it("returns 400 when order is not INVOICE_APPROVED", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "DRAFT_INVOICE",
    } as never);

    const res = await POST(makeRequest({ confirm: true }), { params: paramsPromise });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only approved invoices can be finalized");
  });

  it("returns 400 when confirmation is not provided", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "INVOICE_APPROVED",
    } as never);

    const res = await POST(makeRequest({}), { params: paramsPromise });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Confirmation required to finalize invoice");
  });

  it("finalizes an approved invoice successfully", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "INVOICE_APPROVED",
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
      status: "FINAL_INVOICE",
    } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

    const res = await POST(makeRequest({ confirm: true }), {
      params: paramsPromise,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("FINAL_INVOICE");
  });

  it("sets finalized audit fields", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "INVOICE_APPROVED",
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
      status: "FINAL_INVOICE",
    } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

    await POST(makeRequest({ confirm: true }), { params: paramsPromise });

    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FINAL_INVOICE",
          invoiceFinalizedBy: "test-user-id",
        }),
      })
    );
  });

  it("creates status history record", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "INVOICE_APPROVED",
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
      status: "FINAL_INVOICE",
    } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

    await POST(makeRequest({ confirm: true }), { params: paramsPromise });

    expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith({
      data: {
        orderId: "order-1",
        fromStatus: "INVOICE_APPROVED",
        toStatus: "FINAL_INVOICE",
        changedById: "test-user-id",
        notes: null,
      },
    });
  });
});
