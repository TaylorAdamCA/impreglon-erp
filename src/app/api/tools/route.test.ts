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

function makeRequest(queryString = "") {
  const url = queryString
    ? `http://localhost:3000/api/tools?${queryString}`
    : "http://localhost:3000/api/tools";
  return new NextRequest(new URL(url));
}

function makeJsonRequest(body: unknown) {
  return new NextRequest(new URL("http://localhost:3000/api/tools"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const sampleTools = [
  {
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
  },
  {
    id: "tool-2",
    toolNo: 2,
    description: "5-inch sleeve",
    toolType: "Sleeve",
    status: "RETIRED",
    price: 200.0,
    owner: "Customer Corp",
    location: "Shop B",
    isProprietary: false,
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01"),
  },
];

describe("GET /api/tools", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 403 when user lacks tool_view permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it("returns paginated list of tools", async () => {
    mockPrisma.tool.findMany.mockResolvedValueOnce(sampleTools as never);
    mockPrisma.tool.count.mockResolvedValueOnce(2);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(20);
  });

  it("filters by status", async () => {
    mockPrisma.tool.findMany.mockResolvedValueOnce([sampleTools[0]] as never);
    mockPrisma.tool.count.mockResolvedValueOnce(1);

    await GET(makeRequest("status=ACTIVE"));

    expect(mockPrisma.tool.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "ACTIVE" }),
      })
    );
  });

  it("filters by proprietary=true", async () => {
    mockPrisma.tool.findMany.mockResolvedValueOnce([sampleTools[0]] as never);
    mockPrisma.tool.count.mockResolvedValueOnce(1);

    await GET(makeRequest("proprietary=true"));

    expect(mockPrisma.tool.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isProprietary: true }),
      })
    );
  });

  it("filters by proprietary=false", async () => {
    mockPrisma.tool.findMany.mockResolvedValueOnce([sampleTools[1]] as never);
    mockPrisma.tool.count.mockResolvedValueOnce(1);

    await GET(makeRequest("proprietary=false"));

    expect(mockPrisma.tool.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isProprietary: false }),
      })
    );
  });

  it("searches by description (insensitive contains)", async () => {
    mockPrisma.tool.findMany.mockResolvedValueOnce([sampleTools[0]] as never);
    mockPrisma.tool.count.mockResolvedValueOnce(1);

    await GET(makeRequest("search=mandrel"));

    const call = mockPrisma.tool.findMany.mock.calls[0][0] as {
      where: { OR?: unknown[] };
    };
    expect(call.where.OR).toBeDefined();
    // description + owner (non-numeric search, no toolNo match)
    expect(call.where.OR).toHaveLength(2);
  });

  it("searches by owner (insensitive contains)", async () => {
    mockPrisma.tool.findMany.mockResolvedValueOnce([sampleTools[0]] as never);
    mockPrisma.tool.count.mockResolvedValueOnce(1);

    await GET(makeRequest("search=Impreglon"));

    const call = mockPrisma.tool.findMany.mock.calls[0][0] as {
      where: { OR?: unknown[] };
    };
    expect(call.where.OR).toBeDefined();
  });

  it("searches by toolNo when search is numeric", async () => {
    mockPrisma.tool.findMany.mockResolvedValueOnce([sampleTools[0]] as never);
    mockPrisma.tool.count.mockResolvedValueOnce(1);

    await GET(makeRequest("search=1"));

    const call = mockPrisma.tool.findMany.mock.calls[0][0] as {
      where: { OR?: unknown[] };
    };
    // description + owner + toolNo (numeric search)
    expect(call.where.OR).toHaveLength(3);
  });
});

describe("POST /api/tools", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makeJsonRequest({ description: "Test tool" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user lacks tool_create permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    const res = await POST(makeJsonRequest({ description: "Test tool" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid data", async () => {
    const res = await POST(makeJsonRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("creates tool with auto-incremented toolNo", async () => {
    mockPrisma.tool.findFirst.mockResolvedValueOnce({
      toolNo: 42,
    } as never);
    mockPrisma.tool.create.mockResolvedValueOnce({
      id: "new-tool-id",
      toolNo: 43,
      description: "New mandrel",
      status: "ACTIVE",
    } as never);

    const res = await POST(makeJsonRequest({ description: "New mandrel" }));

    expect(res.status).toBe(201);
    expect(mockPrisma.tool.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          toolNo: 43,
          description: "New mandrel",
        }),
      })
    );
  });

  it("starts at toolNo 1 when no existing tools", async () => {
    mockPrisma.tool.findFirst.mockResolvedValueOnce(null);
    mockPrisma.tool.create.mockResolvedValueOnce({
      id: "first-tool-id",
      toolNo: 1,
      description: "First tool",
      status: "ACTIVE",
    } as never);

    await POST(makeJsonRequest({ description: "First tool" }));

    expect(mockPrisma.tool.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ toolNo: 1 }),
      })
    );
  });
});
