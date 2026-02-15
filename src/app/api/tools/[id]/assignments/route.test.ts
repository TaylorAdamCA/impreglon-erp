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

import { POST } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

const paramsPromise = Promise.resolve({ id: "tool-1" });

function makeRequest(method: string, body?: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/tools/tool-1/assignments"),
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

describe("POST /api/tools/[id]/assignments", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await POST(makeRequest("POST", { orderId: "order-1" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(401);
  });

  it("returns 403 when user lacks tool_modify permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await POST(makeRequest("POST", { orderId: "order-1" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(403);
  });

  it("creates an assignment and returns 201", async () => {
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
        orderId: "order-1",
        assignment: "Valve coating job",
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.orderId).toBe("order-1");
    expect(body.assignment).toBe("Valve coating job");
    expect(mockPrisma.toolAssignment.create).toHaveBeenCalledWith({
      data: {
        orderId: "order-1",
        assignment: "Valve coating job",
        toolId: "tool-1",
      },
    });
  });

  it("rejects assignment of a RETIRED tool with 400", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce({
      status: "RETIRED",
    } as never);

    const res = await POST(makeRequest("POST", { orderId: "order-1" }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Cannot assign a retired tool");
  });

  it("returns 400 for missing orderId", async () => {
    const res = await POST(makeRequest("POST", {}), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });
});
