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

describe("GET /api/products", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await GET(makeRequest("/api/products?type=ANSI_VALVE"));

    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid library type", async () => {
    const res = await GET(makeRequest("/api/products?type=INVALID"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid library type");
  });

  it("returns paginated products with labels", async () => {
    const mockItems = [
      { id: "1", libraryNo: 1, description: "Gate Valve" },
      { id: "2", libraryNo: 2, description: "Ball Valve" },
    ];
    const mockLabels = [
      { slotNumber: 1, coatingName: "Xylan", areaSpec: "Full" },
    ];

    mockPrisma.productLibraryItem.findMany.mockResolvedValueOnce(
      mockItems as never
    );
    mockPrisma.productLibraryItem.count.mockResolvedValueOnce(2);
    mockPrisma.coatingPriceLabel.findMany.mockResolvedValueOnce(
      mockLabels as never
    );

    const res = await GET(
      makeRequest("/api/products?type=ANSI_VALVE&page=1&pageSize=50")
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.labels).toHaveLength(1);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(50);
  });

  it("defaults to ANSI_VALVE when no type specified", async () => {
    mockPrisma.productLibraryItem.findMany.mockResolvedValueOnce([]);
    mockPrisma.productLibraryItem.count.mockResolvedValueOnce(0);
    mockPrisma.coatingPriceLabel.findMany.mockResolvedValueOnce([]);

    await GET(makeRequest("/api/products"));

    expect(mockPrisma.productLibraryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ libraryType: "ANSI_VALVE" }),
      })
    );
  });

  it("filters inactive products by default", async () => {
    mockPrisma.productLibraryItem.findMany.mockResolvedValueOnce([]);
    mockPrisma.productLibraryItem.count.mockResolvedValueOnce(0);
    mockPrisma.coatingPriceLabel.findMany.mockResolvedValueOnce([]);

    await GET(makeRequest("/api/products?type=FITTING"));

    expect(mockPrisma.productLibraryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      })
    );
  });

  it("includes inactive products when showInactive=true", async () => {
    mockPrisma.productLibraryItem.findMany.mockResolvedValueOnce([]);
    mockPrisma.productLibraryItem.count.mockResolvedValueOnce(0);
    mockPrisma.coatingPriceLabel.findMany.mockResolvedValueOnce([]);

    await GET(
      makeRequest("/api/products?type=ANSI_VALVE&showInactive=true")
    );

    const call = mockPrisma.productLibraryItem.findMany.mock.calls[0][0];
    expect((call as { where: Record<string, unknown> }).where).not.toHaveProperty("isActive");
  });

  it("applies search filter on description", async () => {
    mockPrisma.productLibraryItem.findMany.mockResolvedValueOnce([]);
    mockPrisma.productLibraryItem.count.mockResolvedValueOnce(0);
    mockPrisma.coatingPriceLabel.findMany.mockResolvedValueOnce([]);

    await GET(makeRequest("/api/products?type=ANSI_VALVE&search=gate"));

    const call = mockPrisma.productLibraryItem.findMany.mock.calls[0][0] as {
      where: { OR?: unknown[] };
    };
    expect(call.where.OR).toBeDefined();
  });
});

describe("POST /api/products", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await POST(
      makeJsonRequest("/api/products", {
        libraryType: "ANSI_VALVE",
        description: "Test",
      })
    );

    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid data", async () => {
    const res = await POST(
      makeJsonRequest("/api/products", { libraryType: "INVALID" })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("creates product with auto-incremented libraryNo", async () => {
    mockPrisma.productLibraryItem.findFirst.mockResolvedValueOnce({
      libraryNo: 42,
    } as never);
    mockPrisma.productLibraryItem.create.mockResolvedValueOnce({
      id: "new-id",
      libraryNo: 43,
      description: "New Valve",
    } as never);

    const res = await POST(
      makeJsonRequest("/api/products", {
        libraryType: "ANSI_VALVE",
        description: "New Valve",
      })
    );

    expect(res.status).toBe(201);
    expect(mockPrisma.productLibraryItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ libraryNo: 43 }),
      })
    );
  });

  it("starts at libraryNo 1 when no existing items", async () => {
    mockPrisma.productLibraryItem.findFirst.mockResolvedValueOnce(null);
    mockPrisma.productLibraryItem.create.mockResolvedValueOnce({
      id: "first-id",
      libraryNo: 1,
    } as never);

    await POST(
      makeJsonRequest("/api/products", {
        libraryType: "FITTING",
        description: "First Fitting",
      })
    );

    expect(mockPrisma.productLibraryItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ libraryNo: 1 }),
      })
    );
  });
});
