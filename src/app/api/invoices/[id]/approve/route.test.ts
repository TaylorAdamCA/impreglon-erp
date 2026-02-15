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
    new URL("http://localhost:3000/api/invoices/order-1/approve"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

describe("POST /api/invoices/[id]/approve", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user lacks invoice_approve permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    const res = await POST(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(403);
  });

  it("returns 404 when order not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(404);
  });

  it("returns 400 when order is not in approvable status", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "SHIPPED",
      invoiceDraftedBy: "user-2",
    } as never);

    const res = await POST(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only draft or modified invoices can be approved");
  });

  it("approves a DRAFT_INVOICE successfully", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "DRAFT_INVOICE",
      invoiceDraftedBy: "user-2",
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
      status: "INVOICE_APPROVED",
    } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

    const res = await POST(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("INVOICE_APPROVED");
  });

  it("approves an INVOICE_MODIFIED successfully", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "INVOICE_MODIFIED",
      invoiceDraftedBy: "user-2",
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
      status: "INVOICE_APPROVED",
    } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

    const res = await POST(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(200);
  });

  it("warns but allows when approver is the same as drafter", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "DRAFT_INVOICE",
      invoiceDraftedBy: "test-user-id",
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
      status: "INVOICE_APPROVED",
    } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

    const res = await POST(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.warning).toBe("Invoice was approved by the same user who drafted it");
  });

  it("creates status history record", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      status: "DRAFT_INVOICE",
      invoiceDraftedBy: "user-2",
    } as never);
    mockPrisma.order.update.mockResolvedValueOnce({
      id: "order-1",
      status: "INVOICE_APPROVED",
    } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);

    await POST(makeRequest(), { params: paramsPromise });

    expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith({
      data: {
        orderId: "order-1",
        fromStatus: "DRAFT_INVOICE",
        toStatus: "INVOICE_APPROVED",
        changedById: "test-user-id",
        notes: null,
      },
    });
  });
});
