import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PUT, DELETE } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeRequest(method: string, body?: unknown) {
  return new NextRequest(
    new URL(
      "http://localhost:3000/api/quotes/quote-1/components/comp-1"
    ),
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

const paramsPromise = Promise.resolve({
  id: "quote-1",
  componentId: "comp-1",
});

describe("PUT /api/quotes/[id]/components/[componentId]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PUT(
      makeRequest("PUT", {
        description: "Updated",
        quantity: 1,
        unitPrice: 10,
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(401);
  });

  it("returns 400 when quote not DRAFT", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce({
      id: "quote-1",
      status: "SENT",
    } as never);

    const res = await PUT(
      makeRequest("PUT", {
        description: "Updated",
        quantity: 1,
        unitPrice: 10,
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only draft quotes can be edited");
  });

  it("updates component and recalculates totals", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce({
      id: "quote-1",
      status: "DRAFT",
    } as never);
    mockPrisma.quoteComponent.update.mockResolvedValueOnce({
      id: "comp-1",
      description: "Updated valve",
      quantity: 5,
      unitPrice: 20,
      lineTotal: 100,
    } as never);
    mockPrisma.quoteComponent.findMany.mockResolvedValueOnce([
      { lineTotal: 100 },
      { lineTotal: 50 },
    ] as never);
    mockPrisma.quote.update.mockResolvedValueOnce({} as never);

    const res = await PUT(
      makeRequest("PUT", {
        description: "Updated valve",
        quantity: 5,
        unitPrice: 20,
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.description).toBe("Updated valve");

    expect(mockPrisma.quoteComponent.update).toHaveBeenCalledWith({
      where: { id: "comp-1" },
      data: {
        description: "Updated valve",
        quantity: 5,
        unitPrice: 20,
        lineTotal: 100,
      },
    });

    expect(mockPrisma.quote.update).toHaveBeenCalledWith({
      where: { id: "quote-1" },
      data: { quoteTotal: 150 },
    });
  });
});

describe("DELETE /api/quotes/[id]/components/[componentId]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await DELETE(makeRequest("DELETE"), {
      params: paramsPromise,
    });

    expect(res.status).toBe(401);
  });

  it("returns 400 when quote not DRAFT", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce({
      id: "quote-1",
      status: "CONVERTED",
    } as never);

    const res = await DELETE(makeRequest("DELETE"), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only draft quotes can be edited");
  });

  it("returns 204 on successful delete and recalculates quoteTotal", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce({
      id: "quote-1",
      status: "DRAFT",
    } as never);
    mockPrisma.quoteComponent.delete.mockResolvedValueOnce({} as never);
    mockPrisma.quoteComponent.findMany.mockResolvedValueOnce([
      { lineTotal: 75 },
    ] as never);
    mockPrisma.quote.update.mockResolvedValueOnce({} as never);

    const res = await DELETE(makeRequest("DELETE"), {
      params: paramsPromise,
    });

    expect(res.status).toBe(204);
    expect(mockPrisma.quoteComponent.delete).toHaveBeenCalledWith({
      where: { id: "comp-1" },
    });
    expect(mockPrisma.quote.update).toHaveBeenCalledWith({
      where: { id: "quote-1" },
      data: { quoteTotal: 75 },
    });
  });
});
