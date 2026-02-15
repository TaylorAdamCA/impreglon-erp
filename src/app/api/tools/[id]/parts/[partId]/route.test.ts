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

import { PUT, DELETE } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

const paramsPromise = Promise.resolve({ id: "tool-1", partId: "part-1" });

function makeRequest(method: string, body?: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/tools/tool-1/parts/part-1"),
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

describe("PUT /api/tools/[id]/parts/[partId]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PUT(
      makeRequest("PUT", { partNo: "P-001", description: "Updated" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(401);
  });

  it("returns 403 when user lacks tool_modify permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await PUT(
      makeRequest("PUT", { partNo: "P-001", description: "Updated" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(403);
  });

  it("updates a part", async () => {
    const updatedPart = {
      id: "part-1",
      toolId: "tool-1",
      partNo: "P-001-A",
      description: "Updated sleeve insert",
      price: 30.0,
      quantity: 3,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-06-01"),
    };
    mockPrisma.toolPart.update.mockResolvedValueOnce(updatedPart as never);

    const res = await PUT(
      makeRequest("PUT", {
        partNo: "P-001-A",
        description: "Updated sleeve insert",
        price: 30.0,
        quantity: 3,
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.partNo).toBe("P-001-A");
    expect(body.description).toBe("Updated sleeve insert");
    expect(mockPrisma.toolPart.update).toHaveBeenCalledWith({
      where: { id: "part-1" },
      data: {
        partNo: "P-001-A",
        description: "Updated sleeve insert",
        price: 30.0,
        quantity: 3,
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

describe("DELETE /api/tools/[id]/parts/[partId]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await DELETE(makeRequest("DELETE"), {
      params: paramsPromise,
    });

    expect(res.status).toBe(401);
  });

  it("deletes a part and returns success", async () => {
    mockPrisma.toolPart.delete.mockResolvedValueOnce({} as never);

    const res = await DELETE(makeRequest("DELETE"), {
      params: paramsPromise,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockPrisma.toolPart.delete).toHaveBeenCalledWith({
      where: { id: "part-1" },
    });
  });
});
