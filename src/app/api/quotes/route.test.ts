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

describe("GET /api/quotes", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await GET(makeRequest("/api/quotes"));

    expect(res.status).toBe(401);
  });

  it("returns paginated quotes", async () => {
    const mockQuotes = [
      { id: "1", quoteNo: 1, customer: { company: "Acme" }, createdBy: { username: "admin" } },
      { id: "2", quoteNo: 2, customer: { company: "Beta Corp" }, createdBy: { username: "admin" } },
    ];
    mockPrisma.quote.findMany.mockResolvedValueOnce(mockQuotes as never);
    mockPrisma.quote.count.mockResolvedValueOnce(2);

    const res = await GET(makeRequest("/api/quotes"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quotes).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(20);
  });

  it("filters by status when provided", async () => {
    mockPrisma.quote.findMany.mockResolvedValueOnce([]);
    mockPrisma.quote.count.mockResolvedValueOnce(0);

    await GET(makeRequest("/api/quotes?status=DRAFT"));

    expect(mockPrisma.quote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "DRAFT" }),
      })
    );
  });

  it("applies search filter on customer company name", async () => {
    mockPrisma.quote.findMany.mockResolvedValueOnce([]);
    mockPrisma.quote.count.mockResolvedValueOnce(0);

    await GET(makeRequest("/api/quotes?search=acme"));

    const call = mockPrisma.quote.findMany.mock.calls[0][0] as {
      where: { OR?: unknown[] };
    };
    expect(call.where.OR).toBeDefined();
    expect(call.where.OR).toHaveLength(1); // customer company only (non-numeric)
  });

  it("includes quoteNo in search when numeric", async () => {
    mockPrisma.quote.findMany.mockResolvedValueOnce([]);
    mockPrisma.quote.count.mockResolvedValueOnce(0);

    await GET(makeRequest("/api/quotes?search=42"));

    const call = mockPrisma.quote.findMany.mock.calls[0][0] as {
      where: { OR?: unknown[] };
    };
    expect(call.where.OR).toHaveLength(2); // customer company + quoteNo
  });

  it("applies pagination correctly", async () => {
    mockPrisma.quote.findMany.mockResolvedValueOnce([]);
    mockPrisma.quote.count.mockResolvedValueOnce(0);

    await GET(makeRequest("/api/quotes?page=3&pageSize=10"));

    expect(mockPrisma.quote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      })
    );
  });
});

describe("POST /api/quotes", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await POST(
      makeJsonRequest("/api/quotes", { customerId: "cust-1" })
    );

    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid data", async () => {
    const res = await POST(makeJsonRequest("/api/quotes", {}));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("creates quote with auto-incremented quoteNo", async () => {
    mockPrisma.quote.findFirst.mockResolvedValueOnce({
      quoteNo: 42,
    } as never);
    mockPrisma.quote.create.mockResolvedValueOnce({
      id: "new-id",
      quoteNo: 43,
      customerId: "cust-1",
    } as never);

    const res = await POST(
      makeJsonRequest("/api/quotes", { customerId: "cust-1" })
    );

    expect(res.status).toBe(201);
    expect(mockPrisma.quote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quoteNo: 43,
          customerId: "cust-1",
          createdById: "test-user-id",
        }),
      })
    );
  });

  it("starts at quoteNo 1 when no existing quotes", async () => {
    mockPrisma.quote.findFirst.mockResolvedValueOnce(null);
    mockPrisma.quote.create.mockResolvedValueOnce({
      id: "first-id",
      quoteNo: 1,
      customerId: "cust-1",
    } as never);

    await POST(
      makeJsonRequest("/api/quotes", { customerId: "cust-1" })
    );

    expect(mockPrisma.quote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ quoteNo: 1 }),
      })
    );
  });
});
