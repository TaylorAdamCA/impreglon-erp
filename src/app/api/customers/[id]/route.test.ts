import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { GET, PUT, PATCH } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeRequest(method: string, body?: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/customers/cust-1"),
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

const paramsPromise = Promise.resolve({ id: "cust-1" });

describe("GET /api/customers/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await GET(makeRequest("GET"), { params: paramsPromise });

    expect(res.status).toBe(401);
  });

  it("returns 404 when customer not found", async () => {
    mockPrisma.customer.findUnique.mockResolvedValueOnce(null);

    const res = await GET(makeRequest("GET"), { params: paramsPromise });

    expect(res.status).toBe(404);
  });

  it("returns customer with includes", async () => {
    const mockCustomer = {
      id: "cust-1",
      company: "Acme",
      contacts: [{ name: "John" }],
      shipToAddresses: [{ name: "Warehouse" }],
      carriers: [{ name: "FedEx" }],
      references: [],
    };
    mockPrisma.customer.findUnique.mockResolvedValueOnce(
      mockCustomer as never
    );

    const res = await GET(makeRequest("GET"), { params: paramsPromise });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.company).toBe("Acme");
    expect(body.contacts).toHaveLength(1);
    expect(body.shipToAddresses).toHaveLength(1);
    expect(body.carriers).toHaveLength(1);
  });

  it("queries with correct includes and ordering", async () => {
    mockPrisma.customer.findUnique.mockResolvedValueOnce(null);

    await GET(makeRequest("GET"), { params: paramsPromise });

    expect(mockPrisma.customer.findUnique).toHaveBeenCalledWith({
      where: { id: "cust-1" },
      include: {
        contacts: { orderBy: { name: "asc" } },
        shipToAddresses: { orderBy: { name: "asc" } },
        carriers: { orderBy: { name: "asc" } },
        references: { orderBy: { createdAt: "desc" } },
      },
    });
  });
});

describe("PUT /api/customers/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PUT(makeRequest("PUT", { company: "Updated" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid data", async () => {
    const res = await PUT(makeRequest("PUT", {}), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
  });

  it("updates customer successfully", async () => {
    const updated = { id: "cust-1", company: "Updated Corp" };
    mockPrisma.customer.update.mockResolvedValueOnce(updated as never);

    const res = await PUT(
      makeRequest("PUT", { company: "Updated Corp", city: "Edmonton" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.company).toBe("Updated Corp");
  });
});

describe("PATCH /api/customers/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PATCH(makeRequest("PATCH", { isActive: false }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid PATCH body", async () => {
    const res = await PATCH(
      makeRequest("PATCH", { something: "invalid" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
  });

  it("deactivates customer with deletedAt", async () => {
    mockPrisma.customer.update.mockResolvedValueOnce({
      id: "cust-1",
      isActive: false,
    } as never);

    const res = await PATCH(makeRequest("PATCH", { isActive: false }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(200);
    const updateCall = mockPrisma.customer.update.mock.calls[0][0];
    expect(updateCall).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          isActive: false,
          deletedAt: expect.any(Date),
        }),
      })
    );
  });

  it("reactivates customer without deletedAt", async () => {
    mockPrisma.customer.update.mockResolvedValueOnce({
      id: "cust-1",
      isActive: true,
    } as never);

    const res = await PATCH(makeRequest("PATCH", { isActive: true }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(200);
    const updateCall = mockPrisma.customer.update.mock.calls[0][0];
    const data = (updateCall as { data: Record<string, unknown> }).data;
    expect(data.isActive).toBe(true);
    expect(data).not.toHaveProperty("deletedAt");
  });
});
