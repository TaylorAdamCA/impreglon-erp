import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

vi.mock("@/lib/permissions");
import { hasPermission } from "@/lib/permissions";
const mockHasPermission = vi.mocked(hasPermission);

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

describe("GET /api/admin/process-templates", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await GET(makeRequest("/api/admin/process-templates"));

    expect(res.status).toBe(401);
  });

  it("returns 403 when user lacks permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await GET(makeRequest("/api/admin/process-templates"));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns active templates by default", async () => {
    const mockTemplates = [
      { id: "t1", name: "Coating A", isActive: true, steps: [] },
      { id: "t2", name: "Coating B", isActive: true, steps: [] },
    ];
    mockPrisma.processTemplate.findMany.mockResolvedValueOnce(
      mockTemplates as never
    );

    const res = await GET(makeRequest("/api/admin/process-templates"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(mockPrisma.processTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
      })
    );
  });

  it("includes inactive templates when includeInactive=true", async () => {
    mockPrisma.processTemplate.findMany.mockResolvedValueOnce([] as never);

    await GET(
      makeRequest("/api/admin/process-templates?includeInactive=true")
    );

    expect(mockPrisma.processTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      })
    );
  });

  it("includes steps ordered by stepNumber", async () => {
    mockPrisma.processTemplate.findMany.mockResolvedValueOnce([] as never);

    await GET(makeRequest("/api/admin/process-templates"));

    expect(mockPrisma.processTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { steps: { orderBy: { stepNumber: "asc" } } },
        orderBy: { name: "asc" },
      })
    );
  });

  it("checks PROCESS_TEMPLATES_MANAGE permission", async () => {
    mockPrisma.processTemplate.findMany.mockResolvedValueOnce([] as never);

    await GET(makeRequest("/api/admin/process-templates"));

    expect(mockHasPermission).toHaveBeenCalledWith(
      "test-user-id",
      "PROCESS_TEMPLATES_MANAGE"
    );
  });
});

describe("POST /api/admin/process-templates", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await POST(
      makeJsonRequest("/api/admin/process-templates", {
        name: "Test",
        steps: [{ operationName: "Blast" }],
      })
    );

    expect(res.status).toBe(401);
  });

  it("returns 403 when user lacks permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await POST(
      makeJsonRequest("/api/admin/process-templates", {
        name: "Test",
        steps: [{ operationName: "Blast" }],
      })
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 for invalid data — missing name", async () => {
    const res = await POST(
      makeJsonRequest("/api/admin/process-templates", {
        steps: [{ operationName: "Blast" }],
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 400 for invalid data — empty steps array", async () => {
    const res = await POST(
      makeJsonRequest("/api/admin/process-templates", {
        name: "Test",
        steps: [],
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("creates template with steps successfully", async () => {
    const mockCreated = {
      id: "new-template",
      name: "Standard Coating",
      description: "Full coating process",
      isActive: true,
      steps: [
        { id: "s1", stepNumber: 1, operationName: "Blast", description: null },
        { id: "s2", stepNumber: 2, operationName: "Coat", description: "Apply coating" },
      ],
    };
    mockPrisma.processTemplate.create.mockResolvedValueOnce(
      mockCreated as never
    );

    const res = await POST(
      makeJsonRequest("/api/admin/process-templates", {
        name: "Standard Coating",
        description: "Full coating process",
        steps: [
          { operationName: "Blast" },
          { operationName: "Coat", description: "Apply coating" },
        ],
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Standard Coating");
    expect(body.steps).toHaveLength(2);
  });

  it("passes correct data to prisma create with step numbering", async () => {
    mockPrisma.processTemplate.create.mockResolvedValueOnce({
      id: "t1",
      steps: [],
    } as never);

    await POST(
      makeJsonRequest("/api/admin/process-templates", {
        name: "My Template",
        description: "Desc",
        steps: [
          { operationName: "Step A", description: "First" },
          { operationName: "Step B" },
          { operationName: "Step C", description: "Third" },
        ],
      })
    );

    expect(mockPrisma.processTemplate.create).toHaveBeenCalledWith({
      data: {
        name: "My Template",
        description: "Desc",
        steps: {
          create: [
            { stepNumber: 1, operationName: "Step A", description: "First" },
            { stepNumber: 2, operationName: "Step B", description: null },
            { stepNumber: 3, operationName: "Step C", description: "Third" },
          ],
        },
      },
      include: { steps: { orderBy: { stepNumber: "asc" } } },
    });
  });

  it("sets description to null when not provided", async () => {
    mockPrisma.processTemplate.create.mockResolvedValueOnce({
      id: "t1",
      steps: [],
    } as never);

    await POST(
      makeJsonRequest("/api/admin/process-templates", {
        name: "No Desc",
        steps: [{ operationName: "Only Step" }],
      })
    );

    expect(mockPrisma.processTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: null,
        }),
      })
    );
  });
});
