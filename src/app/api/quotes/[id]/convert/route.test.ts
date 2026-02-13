import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { POST } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeRequest() {
  return new NextRequest(
    new URL("http://localhost:3000/api/quotes/quote-1/convert"),
    { method: "POST" }
  );
}

const paramsPromise = Promise.resolve({ id: "quote-1" });

const mockQuoteWithComponents = {
  id: "quote-1",
  quoteNo: 1001,
  customerId: "cust-1",
  status: "APPROVED",
  quoteTotal: 500,
  components: [
    {
      id: "comp-1",
      lineNumber: 1,
      description: "Valve coating - 4 inch",
      quantity: 10,
      unitPrice: 25.0,
      lineTotal: 250.0,
      libraryType: "VALVE",
      libraryItemId: "lib-1",
    },
    {
      id: "comp-2",
      lineNumber: 2,
      description: "Fitting coating - 2 inch",
      quantity: 5,
      unitPrice: 50.0,
      lineTotal: 250.0,
      libraryType: "FITTING",
      libraryItemId: "lib-2",
    },
  ],
};

describe("POST /api/quotes/[id]/convert", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await POST(makeRequest(), { params: paramsPromise });

    expect(res.status).toBe(401);
  });

  it("returns 404 when quote not found", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce(null);

    const res = await POST(makeRequest(), { params: paramsPromise });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Quote not found");
  });

  it("returns 400 when quote is DRAFT", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce({
      ...mockQuoteWithComponents,
      status: "DRAFT",
    } as never);

    const res = await POST(makeRequest(), { params: paramsPromise });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only approved quotes can be converted to orders");
  });

  it("returns 400 when quote is PENDING_APPROVAL", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce({
      ...mockQuoteWithComponents,
      status: "PENDING_APPROVAL",
    } as never);

    const res = await POST(makeRequest(), { params: paramsPromise });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only approved quotes can be converted to orders");
  });

  it("returns 400 when quote is already CONVERTED", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce({
      ...mockQuoteWithComponents,
      status: "CONVERTED",
    } as never);

    const res = await POST(makeRequest(), { params: paramsPromise });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only approved quotes can be converted to orders");
  });

  it("creates order with correct data and returns 201", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce(
      mockQuoteWithComponents as never
    );
    mockPrisma.order.findFirst.mockResolvedValueOnce({
      orderNo: 42,
    } as never);
    mockPrisma.order.create.mockResolvedValueOnce({
      id: "new-order-id",
      orderNo: 43,
      customerId: "cust-1",
      sourceQuoteId: "quote-1",
      orderTotal: 500,
      gstRate: 5,
      gstAmount: 25,
    } as never);
    mockPrisma.orderDetail.create.mockResolvedValue({} as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);
    mockPrisma.quote.update.mockResolvedValueOnce({} as never);

    const res = await POST(makeRequest(), { params: paramsPromise });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("new-order-id");
    expect(body.orderNo).toBe(43);
  });

  it("auto-increments orderNo from highest existing order", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce(
      mockQuoteWithComponents as never
    );
    mockPrisma.order.findFirst.mockResolvedValueOnce({
      orderNo: 100,
    } as never);
    mockPrisma.order.create.mockResolvedValueOnce({
      id: "new-order-id",
      orderNo: 101,
    } as never);
    mockPrisma.orderDetail.create.mockResolvedValue({} as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);
    mockPrisma.quote.update.mockResolvedValueOnce({} as never);

    await POST(makeRequest(), { params: paramsPromise });

    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orderNo: 101 }),
      })
    );
  });

  it("starts at orderNo 1 when no existing orders", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce(
      mockQuoteWithComponents as never
    );
    mockPrisma.order.findFirst.mockResolvedValueOnce(null);
    mockPrisma.order.create.mockResolvedValueOnce({
      id: "first-order-id",
      orderNo: 1,
    } as never);
    mockPrisma.orderDetail.create.mockResolvedValue({} as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);
    mockPrisma.quote.update.mockResolvedValueOnce({} as never);

    await POST(makeRequest(), { params: paramsPromise });

    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orderNo: 1 }),
      })
    );
  });

  it("copies all quote components to order details", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce(
      mockQuoteWithComponents as never
    );
    mockPrisma.order.findFirst.mockResolvedValueOnce(null);
    mockPrisma.order.create.mockResolvedValueOnce({
      id: "order-with-details",
      orderNo: 1,
    } as never);
    mockPrisma.orderDetail.create.mockResolvedValue({} as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);
    mockPrisma.quote.update.mockResolvedValueOnce({} as never);

    await POST(makeRequest(), { params: paramsPromise });

    expect(mockPrisma.orderDetail.create).toHaveBeenCalledTimes(2);

    // First component
    expect(mockPrisma.orderDetail.create).toHaveBeenCalledWith({
      data: {
        orderId: "order-with-details",
        lineNumber: 1,
        description: "Valve coating - 4 inch",
        quantity: 10,
        unitPrice: 25.0,
        lineTotal: 250.0,
        libraryType: "VALVE",
        libraryItemId: "lib-1",
      },
    });

    // Second component
    expect(mockPrisma.orderDetail.create).toHaveBeenCalledWith({
      data: {
        orderId: "order-with-details",
        lineNumber: 2,
        description: "Fitting coating - 2 inch",
        quantity: 5,
        unitPrice: 50.0,
        lineTotal: 250.0,
        libraryType: "FITTING",
        libraryItemId: "lib-2",
      },
    });
  });

  it("calculates orderTotal and gstAmount correctly", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce(
      mockQuoteWithComponents as never
    );
    mockPrisma.order.findFirst.mockResolvedValueOnce(null);
    mockPrisma.order.create.mockResolvedValueOnce({
      id: "totals-order",
      orderNo: 1,
    } as never);
    mockPrisma.orderDetail.create.mockResolvedValue({} as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);
    mockPrisma.quote.update.mockResolvedValueOnce({} as never);

    await POST(makeRequest(), { params: paramsPromise });

    // orderTotal = 250 + 250 = 500
    // gstAmount = 500 * 5 / 100 = 25
    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderTotal: 500,
          gstRate: 5,
          gstAmount: 25,
        }),
      })
    );
  });

  it("sets sourceQuoteId on the new order", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce(
      mockQuoteWithComponents as never
    );
    mockPrisma.order.findFirst.mockResolvedValueOnce(null);
    mockPrisma.order.create.mockResolvedValueOnce({
      id: "source-order",
      orderNo: 1,
    } as never);
    mockPrisma.orderDetail.create.mockResolvedValue({} as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);
    mockPrisma.quote.update.mockResolvedValueOnce({} as never);

    await POST(makeRequest(), { params: paramsPromise });

    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceQuoteId: "quote-1",
          customerId: "cust-1",
        }),
      })
    );
  });

  it("creates initial OrderStatusHistory record", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce(
      mockQuoteWithComponents as never
    );
    mockPrisma.order.findFirst.mockResolvedValueOnce(null);
    mockPrisma.order.create.mockResolvedValueOnce({
      id: "history-order",
      orderNo: 1,
    } as never);
    mockPrisma.orderDetail.create.mockResolvedValue({} as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);
    mockPrisma.quote.update.mockResolvedValueOnce({} as never);

    await POST(makeRequest(), { params: paramsPromise });

    expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith({
      data: {
        orderId: "history-order",
        fromStatus: null,
        toStatus: "PENDING",
        changedById: "test-user-id",
      },
    });
  });

  it("updates quote status to CONVERTED", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce(
      mockQuoteWithComponents as never
    );
    mockPrisma.order.findFirst.mockResolvedValueOnce(null);
    mockPrisma.order.create.mockResolvedValueOnce({
      id: "convert-order",
      orderNo: 1,
    } as never);
    mockPrisma.orderDetail.create.mockResolvedValue({} as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);
    mockPrisma.quote.update.mockResolvedValueOnce({} as never);

    await POST(makeRequest(), { params: paramsPromise });

    expect(mockPrisma.quote.update).toHaveBeenCalledWith({
      where: { id: "quote-1" },
      data: { status: "CONVERTED" },
    });
  });

  it("handles quote with no components (zero total)", async () => {
    const emptyQuote = {
      ...mockQuoteWithComponents,
      components: [],
      quoteTotal: 0,
    };
    mockPrisma.quote.findUnique.mockResolvedValueOnce(emptyQuote as never);
    mockPrisma.order.findFirst.mockResolvedValueOnce(null);
    mockPrisma.order.create.mockResolvedValueOnce({
      id: "empty-order",
      orderNo: 1,
    } as never);
    mockPrisma.orderStatusHistory.create.mockResolvedValueOnce({} as never);
    mockPrisma.quote.update.mockResolvedValueOnce({} as never);

    const res = await POST(makeRequest(), { params: paramsPromise });

    expect(res.status).toBe(201);
    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderTotal: 0,
          gstAmount: 0,
        }),
      })
    );
    expect(mockPrisma.orderDetail.create).not.toHaveBeenCalled();
  });
});
