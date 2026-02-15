import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
  getUserPermissions: vi.fn().mockResolvedValue([]),
}));
import { hasPermission } from "@/lib/permissions";
const mockHasPermission = vi.mocked(hasPermission);

import { GET, PUT, PATCH } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeRequest(method: string, body?: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/tools/tool-1"),
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

const paramsPromise = Promise.resolve({ id: "tool-1" });

const sampleTool = {
  id: "tool-1",
  toolNo: 1,
  description: "3-inch mandrel",
  toolType: "Mandrel",
  status: "ACTIVE",
  price: 150.0,
  owner: "Impreglon",
  location: "Shop A",
  isProprietary: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  parts: [
    { id: "part-1", partNo: "P-001", description: "Sleeve insert", price: 25.0, quantity: 2 },
  ],
  assignments: [
    {
      id: "assign-1",
      assignment: "Coating job",
      createdAt: new Date("2024-06-01"),
      order: { id: "order-1", orderNo: 1001, customer: { company: "Acme Corp" } },
    },
  ],
  receipts: [
    { id: "receipt-1", receivedBy: "user-1", receivedAt: new Date("2024-07-01"), condition: "Good", notes: null },
  ],
};

describe("GET /api/tools/[id]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await GET(makeRequest("GET"), { params: paramsPromise });

    expect(res.status).toBe(401);
  });

  it("returns 404 when tool not found", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce(null);

    const res = await GET(makeRequest("GET"), { params: paramsPromise });

    expect(res.status).toBe(404);
  });

  it("returns tool with parts, assignments, and receipts", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce(sampleTool as never);

    const res = await GET(makeRequest("GET"), { params: paramsPromise });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("tool-1");
    expect(body.description).toBe("3-inch mandrel");
    expect(body.parts).toHaveLength(1);
    expect(body.parts[0].partNo).toBe("P-001");
    expect(body.assignments).toHaveLength(1);
    expect(body.assignments[0].order.customer.company).toBe("Acme Corp");
    expect(body.receipts).toHaveLength(1);

    // Verify the correct include structure was used
    expect(mockPrisma.tool.findUnique).toHaveBeenCalledWith({
      where: { id: "tool-1" },
      include: {
        parts: { orderBy: { partNo: "asc" } },
        assignments: {
          include: {
            order: {
              select: { id: true, orderNo: true, customer: { select: { company: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        receipts: { orderBy: { receivedAt: "desc" } },
      },
    });
  });
});

describe("PUT /api/tools/[id]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 403 when user lacks tool_modify permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await PUT(
      makeRequest("PUT", { description: "Updated mandrel" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(403);
  });

  it("updates tool details", async () => {
    const updated = {
      id: "tool-1",
      toolNo: 1,
      description: "Updated mandrel",
      toolType: "Sleeve",
      status: "ACTIVE",
      price: 200.0,
      owner: "Customer Corp",
      location: "Shop B",
      isProprietary: false,
    };
    mockPrisma.tool.update.mockResolvedValueOnce(updated as never);

    const res = await PUT(
      makeRequest("PUT", {
        description: "Updated mandrel",
        toolType: "Sleeve",
        price: 200.0,
        owner: "Customer Corp",
        location: "Shop B",
        isProprietary: false,
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.description).toBe("Updated mandrel");
    expect(body.toolType).toBe("Sleeve");
    expect(mockPrisma.tool.update).toHaveBeenCalledWith({
      where: { id: "tool-1" },
      data: {
        description: "Updated mandrel",
        toolType: "Sleeve",
        price: 200.0,
        owner: "Customer Corp",
        location: "Shop B",
        isProprietary: false,
      },
    });
  });

  it("returns 400 for invalid data", async () => {
    const res = await PUT(makeRequest("PUT", {}), { params: paramsPromise });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });
});

describe("PATCH /api/tools/[id]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("changes tool status", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce({
      id: "tool-1",
      status: "ACTIVE",
    } as never);
    mockPrisma.tool.update.mockResolvedValueOnce({
      id: "tool-1",
      status: "IN_USE",
    } as never);

    const res = await PATCH(
      makeRequest("PATCH", { status: "IN_USE" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("IN_USE");
    expect(mockPrisma.tool.update).toHaveBeenCalledWith({
      where: { id: "tool-1" },
      data: { status: "IN_USE" },
    });
  });

  it("rejects status change on RETIRED tool", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce({
      id: "tool-1",
      status: "RETIRED",
    } as never);

    const res = await PATCH(
      makeRequest("PATCH", { status: "ACTIVE" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Cannot change status of a retired tool");
  });

  it("rejects invalid status", async () => {
    const res = await PATCH(
      makeRequest("PATCH", { status: "BOGUS" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });
});
