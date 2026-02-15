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
    new URL("http://localhost:3000/api/tools/tool-1/receive"),
    {
      method,
      ...(body !== undefined
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    }
  );
}

describe("POST /api/tools/[id]/receive", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await POST(makeRequest("POST", {}), {
      params: paramsPromise,
    });

    expect(res.status).toBe(401);
  });

  it("returns 403 when user lacks tool_receive permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await POST(makeRequest("POST", {}), {
      params: paramsPromise,
    });

    expect(res.status).toBe(403);
  });

  it("returns 404 when tool is not found", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce(null);

    const res = await POST(makeRequest("POST", {}), {
      params: paramsPromise,
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Tool not found");
  });

  it("returns 400 when tool is RETIRED", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce({
      status: "RETIRED",
    } as never);

    const res = await POST(makeRequest("POST", {}), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Cannot receive a retired tool");
  });

  it("records receipt and updates status to RECEIVED", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce({
      status: "ACTIVE",
    } as never);

    const newReceipt = {
      id: "receipt-1",
      toolId: "tool-1",
      receivedBy: "test-user-id",
      condition: "Good",
      notes: "No damage observed",
      receivedAt: new Date("2024-06-01"),
    };
    mockPrisma.toolReceipt.create.mockResolvedValueOnce(newReceipt as never);
    mockPrisma.tool.update.mockResolvedValueOnce({} as never);

    const res = await POST(
      makeRequest("POST", { condition: "Good", notes: "No damage observed" }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.toolId).toBe("tool-1");
    expect(body.receivedBy).toBe("test-user-id");
    expect(body.condition).toBe("Good");
    expect(body.notes).toBe("No damage observed");

    expect(mockPrisma.toolReceipt.create).toHaveBeenCalledWith({
      data: {
        toolId: "tool-1",
        receivedBy: "test-user-id",
        condition: "Good",
        notes: "No damage observed",
      },
    });

    expect(mockPrisma.tool.update).toHaveBeenCalledWith({
      where: { id: "tool-1" },
      data: { status: "RECEIVED" },
    });
  });

  it("records receipt with no condition or notes (empty body works)", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce({
      status: "ACTIVE",
    } as never);

    const newReceipt = {
      id: "receipt-2",
      toolId: "tool-1",
      receivedBy: "test-user-id",
      condition: undefined,
      notes: undefined,
      receivedAt: new Date("2024-06-01"),
    };
    mockPrisma.toolReceipt.create.mockResolvedValueOnce(newReceipt as never);
    mockPrisma.tool.update.mockResolvedValueOnce({} as never);

    const res = await POST(makeRequest("POST", {}), {
      params: paramsPromise,
    });

    expect(res.status).toBe(201);

    expect(mockPrisma.toolReceipt.create).toHaveBeenCalledWith({
      data: {
        toolId: "tool-1",
        receivedBy: "test-user-id",
        condition: undefined,
        notes: undefined,
      },
    });

    expect(mockPrisma.tool.update).toHaveBeenCalledWith({
      where: { id: "tool-1" },
      data: { status: "RECEIVED" },
    });
  });
});
