import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { POST } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeJsonRequest(body: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/quotes/quote-1/components"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

const paramsPromise = Promise.resolve({ id: "quote-1" });

describe("POST /api/quotes/[id]/components", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await POST(
      makeJsonRequest({ description: "Test", quantity: 1, unitPrice: 10 }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(401);
  });

  it("returns 404 when quote not found", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce(null);

    const res = await POST(
      makeJsonRequest({ description: "Test", quantity: 1, unitPrice: 10 }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(404);
  });

  it("returns 400 when quote not DRAFT", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce({
      id: "quote-1",
      status: "APPROVED",
    } as never);

    const res = await POST(
      makeJsonRequest({ description: "Test", quantity: 1, unitPrice: 10 }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only draft quotes can be edited");
  });

  it("returns 400 for invalid data (missing description)", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce({
      id: "quote-1",
      status: "DRAFT",
    } as never);

    const res = await POST(
      makeJsonRequest({ quantity: 1, unitPrice: 10 }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("creates component with auto-incremented lineNumber", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce({
      id: "quote-1",
      status: "DRAFT",
    } as never);
    mockPrisma.quoteComponent.findFirst.mockResolvedValueOnce({
      lineNumber: 3,
    } as never);
    mockPrisma.quoteComponent.create.mockResolvedValueOnce({
      id: "comp-new",
      lineNumber: 4,
      description: "Valve coating",
      quantity: 2,
      unitPrice: 50,
      lineTotal: 100,
    } as never);
    mockPrisma.quoteComponent.findMany.mockResolvedValueOnce([
      { lineTotal: 100 },
    ] as never);
    mockPrisma.quote.update.mockResolvedValueOnce({} as never);

    const res = await POST(
      makeJsonRequest({
        description: "Valve coating",
        quantity: 2,
        unitPrice: 50,
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(201);
    expect(mockPrisma.quoteComponent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quoteId: "quote-1",
          lineNumber: 4,
          description: "Valve coating",
          quantity: 2,
          unitPrice: 50,
          lineTotal: 100,
        }),
      })
    );
  });

  it("looks up coating price from library item when coatingSlot provided", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce({
      id: "quote-1",
      status: "DRAFT",
    } as never);
    mockPrisma.quoteComponent.findFirst.mockResolvedValueOnce(null);
    mockPrisma.productLibraryItem.findUnique.mockResolvedValueOnce({
      coatingPrice1: null,
      coatingPrice2: null,
      coatingPrice3: 75.5,
      coatingPrice4: null,
      coatingPrice5: null,
      coatingPrice6: null,
      coatingPrice7: null,
      coatingPrice8: null,
    } as never);
    mockPrisma.quoteComponent.create.mockResolvedValueOnce({
      id: "comp-new",
      lineNumber: 1,
      description: "Coated valve",
      quantity: 4,
      unitPrice: 75.5,
      lineTotal: 302,
    } as never);
    mockPrisma.quoteComponent.findMany.mockResolvedValueOnce([
      { lineTotal: 302 },
    ] as never);
    mockPrisma.quote.update.mockResolvedValueOnce({} as never);

    const res = await POST(
      makeJsonRequest({
        description: "Coated valve",
        quantity: 4,
        unitPrice: 0,
        libraryItemId: "item-1",
        coatingSlot: 3,
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(201);
    expect(mockPrisma.quoteComponent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          unitPrice: 75.5,
          lineTotal: 302,
        }),
      })
    );
  });

  it("calculates lineTotal correctly (quantity * unitPrice)", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce({
      id: "quote-1",
      status: "DRAFT",
    } as never);
    mockPrisma.quoteComponent.findFirst.mockResolvedValueOnce(null);
    mockPrisma.quoteComponent.create.mockResolvedValueOnce({
      id: "comp-new",
      lineNumber: 1,
      description: "Fitting",
      quantity: 3,
      unitPrice: 33.33,
      lineTotal: 99.99,
    } as never);
    mockPrisma.quoteComponent.findMany.mockResolvedValueOnce([
      { lineTotal: 99.99 },
    ] as never);
    mockPrisma.quote.update.mockResolvedValueOnce({} as never);

    await POST(
      makeJsonRequest({
        description: "Fitting",
        quantity: 3,
        unitPrice: 33.33,
      }),
      { params: paramsPromise }
    );

    expect(mockPrisma.quoteComponent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lineTotal: 99.99,
        }),
      })
    );
  });

  it("recalculates quoteTotal after adding component", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce({
      id: "quote-1",
      status: "DRAFT",
    } as never);
    mockPrisma.quoteComponent.findFirst.mockResolvedValueOnce(null);
    mockPrisma.quoteComponent.create.mockResolvedValueOnce({
      id: "comp-new",
      lineNumber: 1,
    } as never);
    mockPrisma.quoteComponent.findMany.mockResolvedValueOnce([
      { lineTotal: 100 },
      { lineTotal: 200.5 },
    ] as never);
    mockPrisma.quote.update.mockResolvedValueOnce({} as never);

    await POST(
      makeJsonRequest({
        description: "Test",
        quantity: 1,
        unitPrice: 100,
      }),
      { params: paramsPromise }
    );

    expect(mockPrisma.quote.update).toHaveBeenCalledWith({
      where: { id: "quote-1" },
      data: { quoteTotal: 300.5 },
    });
  });
});
