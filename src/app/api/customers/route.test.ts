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

describe("GET /api/customers", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await GET(makeRequest("/api/customers"));

    expect(res.status).toBe(401);
  });

  it("returns paginated customers", async () => {
    const mockCustomers = [
      { id: "1", custNo: 1, company: "Acme" },
      { id: "2", custNo: 2, company: "Beta Corp" },
    ];
    mockPrisma.customer.findMany.mockResolvedValueOnce(mockCustomers as never);
    mockPrisma.customer.count.mockResolvedValueOnce(2);

    const res = await GET(makeRequest("/api/customers"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.customers).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(20);
  });

  it("filters inactive customers by default", async () => {
    mockPrisma.customer.findMany.mockResolvedValueOnce([]);
    mockPrisma.customer.count.mockResolvedValueOnce(0);

    await GET(makeRequest("/api/customers"));

    expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      })
    );
  });

  it("includes inactive when showInactive=true", async () => {
    mockPrisma.customer.findMany.mockResolvedValueOnce([]);
    mockPrisma.customer.count.mockResolvedValueOnce(0);

    await GET(makeRequest("/api/customers?showInactive=true"));

    const call = mockPrisma.customer.findMany.mock.calls[0][0];
    expect((call as { where: Record<string, unknown> }).where).not.toHaveProperty("isActive");
  });

  it("applies search filter on company and city", async () => {
    mockPrisma.customer.findMany.mockResolvedValueOnce([]);
    mockPrisma.customer.count.mockResolvedValueOnce(0);

    await GET(makeRequest("/api/customers?search=acme"));

    const call = mockPrisma.customer.findMany.mock.calls[0][0] as {
      where: { OR?: unknown[] };
    };
    expect(call.where.OR).toBeDefined();
    expect(call.where.OR).toHaveLength(2); // company + city (non-numeric)
  });

  it("includes custNo in search when search term is numeric", async () => {
    mockPrisma.customer.findMany.mockResolvedValueOnce([]);
    mockPrisma.customer.count.mockResolvedValueOnce(0);

    await GET(makeRequest("/api/customers?search=42"));

    const call = mockPrisma.customer.findMany.mock.calls[0][0] as {
      where: { OR?: unknown[] };
    };
    expect(call.where.OR).toHaveLength(3); // company + city + custNo
  });

  it("applies pagination correctly", async () => {
    mockPrisma.customer.findMany.mockResolvedValueOnce([]);
    mockPrisma.customer.count.mockResolvedValueOnce(0);

    await GET(makeRequest("/api/customers?page=3&pageSize=10"));

    expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      })
    );
  });
});

describe("POST /api/customers", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await POST(
      makeJsonRequest("/api/customers", { company: "Test" })
    );

    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid data", async () => {
    const res = await POST(makeJsonRequest("/api/customers", {}));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("creates customer successfully", async () => {
    const newCustomer = {
      id: "new-id",
      company: "New Corp",
      custNo: 100,
    };
    mockPrisma.customer.create.mockResolvedValueOnce(newCustomer as never);

    const res = await POST(
      makeJsonRequest("/api/customers", { company: "New Corp" })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.company).toBe("New Corp");
  });

  it("passes validated data to prisma create", async () => {
    mockPrisma.customer.create.mockResolvedValueOnce({ id: "x" } as never);

    await POST(
      makeJsonRequest("/api/customers", {
        company: "Test Corp",
        city: "Calgary",
        email: "test@test.com",
      })
    );

    expect(mockPrisma.customer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        company: "Test Corp",
        city: "Calgary",
        email: "test@test.com",
      }),
    });
  });
});
