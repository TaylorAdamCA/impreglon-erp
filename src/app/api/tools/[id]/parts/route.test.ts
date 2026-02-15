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

const paramsPromise = Promise.resolve({ id: "tool-1" });

function makeRequest(method: string, body?: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/tools/tool-1/parts"),
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

const sampleParts = [
  {
    id: "part-1",
    toolId: "tool-1",
    partNo: "P-001",
    description: "Sleeve insert",
    price: 25.0,
    quantity: 2,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "part-2",
    toolId: "tool-1",
    partNo: "P-002",
    description: "Seal ring",
    price: 10.0,
    quantity: 4,
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01"),
  },
];

describe("GET /api/tools/[id]/parts", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await GET(makeRequest("GET"), { params: paramsPromise });

    expect(res.status).toBe(401);
  });

  it("returns parts for tool ordered by partNo asc", async () => {
    mockPrisma.toolPart.findMany.mockResolvedValueOnce(sampleParts as never);

    const res = await GET(makeRequest("GET"), { params: paramsPromise });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].partNo).toBe("P-001");
    expect(body[1].partNo).toBe("P-002");
    expect(mockPrisma.toolPart.findMany).toHaveBeenCalledWith({
      where: { toolId: "tool-1" },
      orderBy: { partNo: "asc" },
    });
  });
});

describe("POST /api/tools/[id]/parts", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 403 when user lacks tool_modify permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await POST(
      makeRequest("POST", { partNo: "P-003", description: "Gasket" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(403);
  });

  it("creates a part and returns 201", async () => {
    const newPart = {
      id: "part-3",
      toolId: "tool-1",
      partNo: "P-003",
      description: "Gasket",
      price: 15.0,
      quantity: 1,
      createdAt: new Date("2024-03-01"),
      updatedAt: new Date("2024-03-01"),
    };
    mockPrisma.toolPart.create.mockResolvedValueOnce(newPart as never);

    const res = await POST(
      makeRequest("POST", {
        partNo: "P-003",
        description: "Gasket",
        price: 15.0,
        quantity: 1,
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.partNo).toBe("P-003");
    expect(body.description).toBe("Gasket");
    expect(mockPrisma.toolPart.create).toHaveBeenCalledWith({
      data: {
        partNo: "P-003",
        description: "Gasket",
        price: 15.0,
        quantity: 1,
        toolId: "tool-1",
      },
    });
  });

  it("returns 400 for invalid data", async () => {
    const res = await POST(makeRequest("POST", {}), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });
});
