import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { GET, PUT, DELETE } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeRequest(method: string, body?: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/quotes/quote-1"),
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

const paramsPromise = Promise.resolve({ id: "quote-1" });

describe("GET /api/quotes/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await GET(makeRequest("GET"), { params: paramsPromise });

    expect(res.status).toBe(401);
  });

  it("returns 404 when quote not found", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce(null);

    const res = await GET(makeRequest("GET"), { params: paramsPromise });

    expect(res.status).toBe(404);
  });

  it("returns quote with includes", async () => {
    const mockQuote = {
      id: "quote-1",
      quoteNo: 1001,
      status: "DRAFT",
      customer: { id: "cust-1", company: "Acme Corp" },
      createdBy: { username: "testuser" },
      components: [
        { id: "comp-1", lineNumber: 1, description: "Valve coating" },
      ],
    };
    mockPrisma.quote.findUnique.mockResolvedValueOnce(mockQuote as never);

    const res = await GET(makeRequest("GET"), { params: paramsPromise });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quoteNo).toBe(1001);
    expect(body.customer.company).toBe("Acme Corp");
    expect(body.createdBy.username).toBe("testuser");
    expect(body.components).toHaveLength(1);
  });

  it("queries with correct includes and ordering", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce(null);

    await GET(makeRequest("GET"), { params: paramsPromise });

    expect(mockPrisma.quote.findUnique).toHaveBeenCalledWith({
      where: { id: "quote-1" },
      include: {
        customer: true,
        createdBy: { select: { username: true } },
        components: { orderBy: { lineNumber: "asc" } },
      },
    });
  });
});

describe("PUT /api/quotes/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PUT(
      makeRequest("PUT", { customerId: "cust-2" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(401);
  });

  it("returns 404 when quote not found", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce(null);

    const res = await PUT(
      makeRequest("PUT", { customerId: "cust-2" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(404);
  });

  it("returns 400 when quote is not DRAFT", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce({
      id: "quote-1",
      status: "APPROVED",
    } as never);

    const res = await PUT(
      makeRequest("PUT", { customerId: "cust-2" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only draft quotes can be edited");
  });

  it("returns 400 for invalid data", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce({
      id: "quote-1",
      status: "DRAFT",
    } as never);

    const res = await PUT(makeRequest("PUT", {}), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
  });

  it("updates quote successfully when DRAFT", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce({
      id: "quote-1",
      status: "DRAFT",
    } as never);

    const updated = {
      id: "quote-1",
      customerId: "cust-2",
      status: "DRAFT",
    };
    mockPrisma.quote.update.mockResolvedValueOnce(updated as never);

    const res = await PUT(
      makeRequest("PUT", { customerId: "cust-2" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.customerId).toBe("cust-2");
  });
});

describe("DELETE /api/quotes/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await DELETE(makeRequest("DELETE"), {
      params: paramsPromise,
    });

    expect(res.status).toBe(401);
  });

  it("returns 404 when quote not found", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce(null);

    const res = await DELETE(makeRequest("DELETE"), {
      params: paramsPromise,
    });

    expect(res.status).toBe(404);
  });

  it("returns 400 when quote is not DRAFT", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce({
      id: "quote-1",
      status: "PENDING_APPROVAL",
    } as never);

    const res = await DELETE(makeRequest("DELETE"), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only draft quotes can be deleted");
  });

  it("returns 204 on successful delete", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce({
      id: "quote-1",
      status: "DRAFT",
    } as never);
    mockPrisma.quote.delete.mockResolvedValueOnce({} as never);

    const res = await DELETE(makeRequest("DELETE"), {
      params: paramsPromise,
    });

    expect(res.status).toBe(204);
    expect(mockPrisma.quote.delete).toHaveBeenCalledWith({
      where: { id: "quote-1" },
    });
  });
});
