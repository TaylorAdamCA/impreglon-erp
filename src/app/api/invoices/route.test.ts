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

function makeRequest(queryString = "") {
  const url = queryString
    ? `http://localhost:3000/api/invoices?${queryString}`
    : "http://localhost:3000/api/invoices";
  return new NextRequest(new URL(url));
}

const sampleInvoices = [
  {
    id: "order-1",
    orderNo: 1001,
    invoiceNo: 1,
    invoiceDate: new Date("2024-06-01"),
    status: "DRAFT_INVOICE",
    orderTotal: 5000,
    gstAmount: 50,
    customer: { id: "cust-1", company: "Acme Corp" },
  },
  {
    id: "order-2",
    orderNo: 1002,
    invoiceNo: 2,
    invoiceDate: new Date("2024-06-05"),
    status: "FINAL_INVOICE",
    orderTotal: 3000,
    gstAmount: 30,
    customer: { id: "cust-2", company: "Widget Co" },
  },
];

describe("GET /api/invoices", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 403 when user lacks invoice_view permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it("returns invoices with default filter (all invoice statuses)", async () => {
    mockPrisma.order.findMany.mockResolvedValueOnce(sampleInvoices as never);
    mockPrisma.order.count.mockResolvedValueOnce(2);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoices).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it("filters by specific status", async () => {
    mockPrisma.order.findMany.mockResolvedValueOnce([sampleInvoices[0]] as never);
    mockPrisma.order.count.mockResolvedValueOnce(1);

    const res = await GET(makeRequest("status=DRAFT_INVOICE"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoices).toHaveLength(1);
  });

  it("searches by invoice number", async () => {
    mockPrisma.order.findMany.mockResolvedValueOnce([sampleInvoices[0]] as never);
    mockPrisma.order.count.mockResolvedValueOnce(1);

    const res = await GET(makeRequest("search=1"));
    expect(res.status).toBe(200);
  });

  it("supports pagination", async () => {
    mockPrisma.order.findMany.mockResolvedValueOnce([] as never);
    mockPrisma.order.count.mockResolvedValueOnce(50);

    const res = await GET(makeRequest("page=3&pageSize=10"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.page).toBe(3);
    expect(body.pageSize).toBe(10);
  });
});
