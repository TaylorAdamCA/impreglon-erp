import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PUT, PATCH } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeJsonRequest(method: string, body: unknown) {
  return new NextRequest(new URL("http://localhost:3000/api/products/item-1"), {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const paramsPromise = Promise.resolve({ id: "item-1" });

describe("PUT /api/products/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PUT(
      makeJsonRequest("PUT", {
        libraryType: "ANSI_VALVE",
        description: "Updated",
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid data", async () => {
    const res = await PUT(
      makeJsonRequest("PUT", { description: "No type" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
  });

  it("updates product successfully", async () => {
    const updated = {
      id: "item-1",
      libraryType: "ANSI_VALVE",
      description: "Updated Valve",
    };
    mockPrisma.productLibraryItem.update.mockResolvedValueOnce(
      updated as never
    );

    const res = await PUT(
      makeJsonRequest("PUT", {
        libraryType: "ANSI_VALVE",
        description: "Updated Valve",
        size: '3"',
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.description).toBe("Updated Valve");
  });
});

describe("PATCH /api/products/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PATCH(
      makeJsonRequest("PATCH", { isActive: false }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(401);
  });

  describe("toggle active status", () => {
    it("deactivates product with deletedAt timestamp", async () => {
      mockPrisma.productLibraryItem.update.mockResolvedValueOnce({
        id: "item-1",
        isActive: false,
      } as never);

      const res = await PATCH(
        makeJsonRequest("PATCH", { isActive: false }),
        { params: paramsPromise }
      );

      expect(res.status).toBe(200);
      const updateCall = mockPrisma.productLibraryItem.update.mock.calls[0][0];
      expect(updateCall).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: false,
            deletedAt: expect.any(Date),
          }),
        })
      );
    });

    it("reactivates product without deletedAt", async () => {
      mockPrisma.productLibraryItem.update.mockResolvedValueOnce({
        id: "item-1",
        isActive: true,
      } as never);

      const res = await PATCH(
        makeJsonRequest("PATCH", { isActive: true }),
        { params: paramsPromise }
      );

      expect(res.status).toBe(200);
      const updateCall = mockPrisma.productLibraryItem.update.mock.calls[0][0];
      const data = (updateCall as { data: Record<string, unknown> }).data;
      expect(data.isActive).toBe(true);
      expect(data).not.toHaveProperty("deletedAt");
    });
  });

  describe("inline price update", () => {
    it("auto-calculates DRT selling price (cost × 1.3)", async () => {
      mockPrisma.productLibraryItem.findUnique.mockResolvedValueOnce({
        libraryType: "ANSI_VALVE",
        coatingPrice1: null,
      } as never);
      mockPrisma.productLibraryItem.update.mockResolvedValueOnce({
        id: "item-1",
      } as never);

      await PATCH(
        makeJsonRequest("PATCH", {
          prices: { drtCostLower: 100, drtCostHigher: 200 },
        }),
        { params: paramsPromise }
      );

      const updateCall = mockPrisma.productLibraryItem.update.mock.calls[0][0];
      const data = (updateCall as { data: Record<string, unknown> }).data;
      expect(data.drtSellingLower).toBe(130);
      expect(data.drtSellingHigher).toBe(260);
    });

    it("auto-calculates fitting coatingPrice3 = coatingPrice1 × 1.1", async () => {
      mockPrisma.productLibraryItem.findUnique.mockResolvedValueOnce({
        libraryType: "FITTING",
        coatingPrice1: null,
      } as never);
      mockPrisma.productLibraryItem.update.mockResolvedValueOnce({
        id: "item-1",
      } as never);

      await PATCH(
        makeJsonRequest("PATCH", {
          prices: { coatingPrice1: 50 },
        }),
        { params: paramsPromise }
      );

      const updateCall = mockPrisma.productLibraryItem.update.mock.calls[0][0];
      const data = (updateCall as { data: Record<string, unknown> }).data;
      expect(data.coatingPrice3).toBe(55);
    });

    it("uses existing coatingPrice1 for fitting auto-calc when not in update", async () => {
      mockPrisma.productLibraryItem.findUnique.mockResolvedValueOnce({
        libraryType: "FITTING",
        coatingPrice1: 80,
      } as never);
      mockPrisma.productLibraryItem.update.mockResolvedValueOnce({
        id: "item-1",
      } as never);

      await PATCH(
        makeJsonRequest("PATCH", {
          prices: { coatingPrice2: 100 },
        }),
        { params: paramsPromise }
      );

      const updateCall = mockPrisma.productLibraryItem.update.mock.calls[0][0];
      const data = (updateCall as { data: Record<string, unknown> }).data;
      expect(data.coatingPrice3).toBe(88);
    });

    it("does not auto-calc coatingPrice3 for non-FITTING types", async () => {
      mockPrisma.productLibraryItem.findUnique.mockResolvedValueOnce({
        libraryType: "ANSI_VALVE",
        coatingPrice1: 50,
      } as never);
      mockPrisma.productLibraryItem.update.mockResolvedValueOnce({
        id: "item-1",
      } as never);

      await PATCH(
        makeJsonRequest("PATCH", {
          prices: { coatingPrice1: 50 },
        }),
        { params: paramsPromise }
      );

      const updateCall = mockPrisma.productLibraryItem.update.mock.calls[0][0];
      const data = (updateCall as { data: Record<string, unknown> }).data;
      expect(data).not.toHaveProperty("coatingPrice3");
    });

    it("handles DRT with decimal precision", async () => {
      mockPrisma.productLibraryItem.findUnique.mockResolvedValueOnce({
        libraryType: "ANSI_VALVE",
        coatingPrice1: null,
      } as never);
      mockPrisma.productLibraryItem.update.mockResolvedValueOnce({
        id: "item-1",
      } as never);

      await PATCH(
        makeJsonRequest("PATCH", {
          prices: { drtCostLower: 33.33 },
        }),
        { params: paramsPromise }
      );

      const updateCall = mockPrisma.productLibraryItem.update.mock.calls[0][0];
      const data = (updateCall as { data: Record<string, unknown> }).data;
      expect(data.drtSellingLower).toBe(43.33);
    });

    it("converts null/empty price values to null", async () => {
      mockPrisma.productLibraryItem.findUnique.mockResolvedValueOnce({
        libraryType: "ANSI_VALVE",
        coatingPrice1: null,
      } as never);
      mockPrisma.productLibraryItem.update.mockResolvedValueOnce({
        id: "item-1",
      } as never);

      await PATCH(
        makeJsonRequest("PATCH", {
          prices: { coatingPrice1: "", coatingPrice2: null },
        }),
        { params: paramsPromise }
      );

      const updateCall = mockPrisma.productLibraryItem.update.mock.calls[0][0];
      const data = (updateCall as { data: Record<string, unknown> }).data;
      expect(data.coatingPrice1).toBeNull();
      expect(data.coatingPrice2).toBeNull();
    });

    it("ignores non-allowed price fields", async () => {
      mockPrisma.productLibraryItem.findUnique.mockResolvedValueOnce({
        libraryType: "ANSI_VALVE",
        coatingPrice1: null,
      } as never);
      mockPrisma.productLibraryItem.update.mockResolvedValueOnce({
        id: "item-1",
      } as never);

      await PATCH(
        makeJsonRequest("PATCH", {
          prices: { hackerField: 999, coatingPrice1: 10 },
        }),
        { params: paramsPromise }
      );

      const updateCall = mockPrisma.productLibraryItem.update.mock.calls[0][0];
      const data = (updateCall as { data: Record<string, unknown> }).data;
      expect(data).not.toHaveProperty("hackerField");
      expect(data.coatingPrice1).toBe(10);
    });
  });

  it("returns 400 for invalid PATCH body", async () => {
    const res = await PATCH(
      makeJsonRequest("PATCH", { something: "invalid" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
  });
});
