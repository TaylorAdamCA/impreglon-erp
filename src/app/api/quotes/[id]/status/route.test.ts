import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

vi.mock("@/lib/permissions");
import { hasPermission } from "@/lib/permissions";
const mockHasPermission = vi.mocked(hasPermission);

import { PATCH } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeRequest(body: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/quotes/quote-1/status"),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

const paramsPromise = Promise.resolve({ id: "quote-1" });

describe("PATCH /api/quotes/[id]/status", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  describe("submit", () => {
    it("returns 401 when unauthenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);

      const res = await PATCH(makeRequest({ action: "submit" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(401);
    });

    it("returns 400 when quote not DRAFT", async () => {
      mockPrisma.quote.findUnique.mockResolvedValueOnce({
        id: "quote-1",
        status: "PENDING_APPROVAL",
      } as never);

      const res = await PATCH(makeRequest({ action: "submit" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Only draft quotes can be submitted");
    });

    it("returns 400 when quote has no components", async () => {
      mockPrisma.quote.findUnique.mockResolvedValueOnce({
        id: "quote-1",
        status: "DRAFT",
      } as never);
      mockPrisma.quoteComponent.count.mockResolvedValueOnce(0);

      const res = await PATCH(makeRequest({ action: "submit" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Cannot submit a quote with no line items");
    });

    it("successfully transitions DRAFT -> PENDING_APPROVAL when has components", async () => {
      mockPrisma.quote.findUnique.mockResolvedValueOnce({
        id: "quote-1",
        status: "DRAFT",
      } as never);
      mockPrisma.quoteComponent.count.mockResolvedValueOnce(3);
      mockPrisma.quote.update.mockResolvedValueOnce({
        id: "quote-1",
        status: "PENDING_APPROVAL",
      } as never);

      const res = await PATCH(makeRequest({ action: "submit" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("PENDING_APPROVAL");
      expect(mockPrisma.quote.update).toHaveBeenCalledWith({
        where: { id: "quote-1" },
        data: { status: "PENDING_APPROVAL" },
      });
    });
  });

  describe("approve", () => {
    it("returns 400 when quote not PENDING_APPROVAL", async () => {
      mockPrisma.quote.findUnique.mockResolvedValueOnce({
        id: "quote-1",
        status: "DRAFT",
      } as never);

      const res = await PATCH(makeRequest({ action: "approve" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Only pending quotes can be approved");
    });

    it("returns 403 when user lacks QUOTES_APPROVE permission", async () => {
      mockPrisma.quote.findUnique.mockResolvedValueOnce({
        id: "quote-1",
        status: "PENDING_APPROVAL",
      } as never);
      mockHasPermission.mockResolvedValueOnce(false);

      const res = await PATCH(makeRequest({ action: "approve" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Insufficient permissions");
    });

    it("successfully transitions PENDING_APPROVAL -> APPROVED with permission", async () => {
      mockPrisma.quote.findUnique.mockResolvedValueOnce({
        id: "quote-1",
        status: "PENDING_APPROVAL",
      } as never);
      mockPrisma.quote.update.mockResolvedValueOnce({
        id: "quote-1",
        status: "APPROVED",
      } as never);

      const res = await PATCH(makeRequest({ action: "approve" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("APPROVED");
      expect(mockHasPermission).toHaveBeenCalledWith(
        "test-user-id",
        "QUOTES_APPROVE"
      );
    });
  });

  describe("reject", () => {
    it("returns 400 when quote not PENDING_APPROVAL", async () => {
      mockPrisma.quote.findUnique.mockResolvedValueOnce({
        id: "quote-1",
        status: "DRAFT",
      } as never);

      const res = await PATCH(makeRequest({ action: "reject" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Only pending quotes can be rejected");
    });

    it("returns 403 when user lacks permission", async () => {
      mockPrisma.quote.findUnique.mockResolvedValueOnce({
        id: "quote-1",
        status: "PENDING_APPROVAL",
      } as never);
      mockHasPermission.mockResolvedValueOnce(false);

      const res = await PATCH(makeRequest({ action: "reject" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Insufficient permissions");
    });

    it("successfully transitions PENDING_APPROVAL -> DRAFT with permission", async () => {
      mockPrisma.quote.findUnique.mockResolvedValueOnce({
        id: "quote-1",
        status: "PENDING_APPROVAL",
      } as never);
      mockPrisma.quote.update.mockResolvedValueOnce({
        id: "quote-1",
        status: "DRAFT",
      } as never);

      const res = await PATCH(makeRequest({ action: "reject" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("DRAFT");
      expect(mockHasPermission).toHaveBeenCalledWith(
        "test-user-id",
        "QUOTES_APPROVE"
      );
    });
  });

  describe("invalid action", () => {
    it("returns 400 for invalid action value", async () => {
      const res = await PATCH(makeRequest({ action: "cancel" }), {
        params: paramsPromise,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Validation failed");
    });
  });

  it("returns 404 when quote not found", async () => {
    mockPrisma.quote.findUnique.mockResolvedValueOnce(null);

    const res = await PATCH(makeRequest({ action: "submit" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Quote not found");
  });
});
