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

import { GET, POST } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

const paramsPromise = Promise.resolve({ id: "order-1" });

function makeRequest(method: string, body?: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/orders/order-1/tools"),
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

describe("GET /api/orders/[id]/tools", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await GET(makeRequest("GET"), { params: paramsPromise });

    expect(res.status).toBe(401);
  });

  it("returns tools assigned to order", async () => {
    const mockAssignments = [
      {
        id: "assign-1",
        toolId: "tool-1",
        orderId: "order-1",
        assignment: "Valve coating",
        createdAt: new Date("2024-06-01"),
        tool: {
          id: "tool-1",
          toolNo: "T-001",
          description: "Diamond Mandrel",
          status: "ACTIVE",
          isProprietary: true,
        },
      },
      {
        id: "assign-2",
        toolId: "tool-2",
        orderId: "order-1",
        assignment: null,
        createdAt: new Date("2024-05-15"),
        tool: {
          id: "tool-2",
          toolNo: "T-002",
          description: "Standard Plug",
          status: "ACTIVE",
          isProprietary: false,
        },
      },
    ];
    mockPrisma.toolAssignment.findMany.mockResolvedValueOnce(
      mockAssignments as never
    );

    const res = await GET(makeRequest("GET"), { params: paramsPromise });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].tool.toolNo).toBe("T-001");
    expect(body[1].tool.toolNo).toBe("T-002");
    expect(mockPrisma.toolAssignment.findMany).toHaveBeenCalledWith({
      where: { orderId: "order-1" },
      include: {
        tool: {
          select: {
            id: true,
            toolNo: true,
            description: true,
            status: true,
            isProprietary: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("POST /api/orders/[id]/tools", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("assigns tool to order and returns 201", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce({
      status: "ACTIVE",
    } as never);

    const newAssignment = {
      id: "assign-1",
      toolId: "tool-1",
      orderId: "order-1",
      assignment: "Valve coating job",
      createdAt: new Date("2024-06-01"),
    };
    mockPrisma.toolAssignment.create.mockResolvedValueOnce(
      newAssignment as never
    );

    const res = await POST(
      makeRequest("POST", {
        toolId: "tool-1",
        assignment: "Valve coating job",
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.toolId).toBe("tool-1");
    expect(body.orderId).toBe("order-1");
    expect(body.assignment).toBe("Valve coating job");
    expect(mockPrisma.toolAssignment.create).toHaveBeenCalledWith({
      data: {
        toolId: "tool-1",
        assignment: "Valve coating job",
        orderId: "order-1",
      },
    });
  });

  it("rejects assigning retired tool with 400", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce({
      status: "RETIRED",
    } as never);

    const res = await POST(
      makeRequest("POST", { toolId: "tool-1" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Cannot assign a retired tool");
  });

  it("returns 400 for missing toolId", async () => {
    const res = await POST(makeRequest("POST", {}), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });
});
