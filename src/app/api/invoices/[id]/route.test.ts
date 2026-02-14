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

import { GET } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

const paramsPromise = Promise.resolve({ id: "order-1" });

function makeRequest() {
  return new NextRequest(
    new URL("http://localhost:3000/api/invoices/order-1")
  );
}

const sampleOrder = {
  id: "order-1",
  orderNo: 1001,
  invoiceNo: 1,
  invoiceDate: new Date("2024-06-01"),
  status: "DRAFT_INVOICE",
  orderTotal: 5000,
  gstAmount: 50,
  gstRate: 1.0,
  invoiceDraftedBy: "user-1",
  invoiceDraftedAt: new Date("2024-06-01"),
  invoiceNotes: "Test invoice",
  customer: { id: "cust-1", company: "Acme Corp", custNo: 100 },
  details: [
    {
      id: "detail-1",
      lineNumber: 1,
      description: "Ball valve coating",
      quantity: 10,
      unitPrice: 500,
      lineTotal: 5000,
    },
  ],
  statusHistory: [
    {
      id: "hist-1",
      fromStatus: "SHIPPED",
      toStatus: "DRAFT_INVOICE",
      changedAt: new Date("2024-06-01"),
      changedBy: { username: "admin" },
    },
  ],
};

describe("GET /api/invoices/[id]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user lacks invoice_view permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    const res = await GET(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(403);
  });

  it("returns 404 when order not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);
    const res = await GET(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(404);
  });

  it("returns order with invoice details", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(sampleOrder as never);

    const res = await GET(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoiceNo).toBe(1);
    expect(body.customer.company).toBe("Acme Corp");
    expect(body.details).toHaveLength(1);
    expect(body.statusHistory).toHaveLength(1);
  });
});
