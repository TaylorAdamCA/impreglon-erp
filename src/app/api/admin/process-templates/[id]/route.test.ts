import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

vi.mock("@/lib/permissions");
import { hasPermission } from "@/lib/permissions";
const mockHasPermission = vi.mocked(hasPermission);

import { GET, PUT, DELETE } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

function makeJsonRequest(method: string, body: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/admin/process-templates/template-1"),
    {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

const paramsPromise = Promise.resolve({ id: "template-1" });

describe("GET /api/admin/process-templates/[id]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await GET(
      makeRequest("/api/admin/process-templates/template-1"),
      { params: paramsPromise }
    );

    expect(res.status).toBe(401);
  });

  it("returns 403 when user lacks permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await GET(
      makeRequest("/api/admin/process-templates/template-1"),
      { params: paramsPromise }
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 404 when template not found", async () => {
    mockPrisma.processTemplate.findUnique.mockResolvedValueOnce(null);

    const res = await GET(
      makeRequest("/api/admin/process-templates/template-1"),
      { params: paramsPromise }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Template not found");
  });

  it("returns template with steps", async () => {
    const mockTemplate = {
      id: "template-1",
      name: "Standard Coating",
      description: "Full process",
      isActive: true,
      steps: [
        { id: "s1", stepNumber: 1, operationName: "Blast", description: null },
        { id: "s2", stepNumber: 2, operationName: "Coat", description: "Apply" },
      ],
    };
    mockPrisma.processTemplate.findUnique.mockResolvedValueOnce(
      mockTemplate as never
    );

    const res = await GET(
      makeRequest("/api/admin/process-templates/template-1"),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Standard Coating");
    expect(body.steps).toHaveLength(2);
  });

  it("includes steps ordered by stepNumber", async () => {
    mockPrisma.processTemplate.findUnique.mockResolvedValueOnce({
      id: "template-1",
      steps: [],
    } as never);

    await GET(
      makeRequest("/api/admin/process-templates/template-1"),
      { params: paramsPromise }
    );

    expect(mockPrisma.processTemplate.findUnique).toHaveBeenCalledWith({
      where: { id: "template-1" },
      include: { steps: { orderBy: { stepNumber: "asc" } } },
    });
  });

  it("checks PROCESS_TEMPLATES_MANAGE permission", async () => {
    mockPrisma.processTemplate.findUnique.mockResolvedValueOnce({
      id: "template-1",
      steps: [],
    } as never);

    await GET(
      makeRequest("/api/admin/process-templates/template-1"),
      { params: paramsPromise }
    );

    expect(mockHasPermission).toHaveBeenCalledWith(
      "test-user-id",
      "PROCESS_TEMPLATES_MANAGE"
    );
  });
});

describe("PUT /api/admin/process-templates/[id]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PUT(
      makeJsonRequest("PUT", {
        name: "Updated",
        steps: [{ operationName: "Blast" }],
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(401);
  });

  it("returns 403 when user lacks permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await PUT(
      makeJsonRequest("PUT", {
        name: "Updated",
        steps: [{ operationName: "Blast" }],
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 404 when template not found", async () => {
    mockPrisma.processTemplate.findUnique.mockResolvedValueOnce(null);

    const res = await PUT(
      makeJsonRequest("PUT", {
        name: "Updated",
        steps: [{ operationName: "Blast" }],
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Template not found");
  });

  it("returns 400 for invalid data — missing name", async () => {
    mockPrisma.processTemplate.findUnique.mockResolvedValueOnce({
      id: "template-1",
    } as never);

    const res = await PUT(
      makeJsonRequest("PUT", {
        steps: [{ operationName: "Blast" }],
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 400 for invalid data — empty steps", async () => {
    mockPrisma.processTemplate.findUnique.mockResolvedValueOnce({
      id: "template-1",
    } as never);

    const res = await PUT(
      makeJsonRequest("PUT", {
        name: "Updated",
        steps: [],
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("updates template and replaces steps", async () => {
    mockPrisma.processTemplate.findUnique.mockResolvedValueOnce({
      id: "template-1",
    } as never);
    mockPrisma.processTemplateStep.deleteMany.mockResolvedValueOnce({
      count: 2,
    } as never);
    const mockUpdated = {
      id: "template-1",
      name: "Updated Coating",
      description: "New desc",
      isActive: true,
      steps: [
        { id: "s3", stepNumber: 1, operationName: "New Step", description: null },
      ],
    };
    mockPrisma.processTemplate.update.mockResolvedValueOnce(
      mockUpdated as never
    );

    const res = await PUT(
      makeJsonRequest("PUT", {
        name: "Updated Coating",
        description: "New desc",
        steps: [{ operationName: "New Step" }],
      }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Updated Coating");
    expect(body.steps).toHaveLength(1);
  });

  it("deletes existing steps before creating new ones", async () => {
    mockPrisma.processTemplate.findUnique.mockResolvedValueOnce({
      id: "template-1",
    } as never);
    mockPrisma.processTemplateStep.deleteMany.mockResolvedValueOnce({
      count: 3,
    } as never);
    mockPrisma.processTemplate.update.mockResolvedValueOnce({
      id: "template-1",
      steps: [],
    } as never);

    await PUT(
      makeJsonRequest("PUT", {
        name: "Updated",
        steps: [{ operationName: "Only" }],
      }),
      { params: paramsPromise }
    );

    expect(mockPrisma.processTemplateStep.deleteMany).toHaveBeenCalledWith({
      where: { templateId: "template-1" },
    });
  });

  it("passes correct step numbering to prisma update", async () => {
    mockPrisma.processTemplate.findUnique.mockResolvedValueOnce({
      id: "template-1",
    } as never);
    mockPrisma.processTemplateStep.deleteMany.mockResolvedValueOnce({
      count: 0,
    } as never);
    mockPrisma.processTemplate.update.mockResolvedValueOnce({
      id: "template-1",
      steps: [],
    } as never);

    await PUT(
      makeJsonRequest("PUT", {
        name: "Updated",
        steps: [
          { operationName: "A", description: "First" },
          { operationName: "B" },
        ],
      }),
      { params: paramsPromise }
    );

    expect(mockPrisma.processTemplate.update).toHaveBeenCalledWith({
      where: { id: "template-1" },
      data: {
        name: "Updated",
        description: null,
        steps: {
          create: [
            { stepNumber: 1, operationName: "A", description: "First" },
            { stepNumber: 2, operationName: "B", description: null },
          ],
        },
      },
      include: { steps: { orderBy: { stepNumber: "asc" } } },
    });
  });

  it("includes isActive when provided", async () => {
    mockPrisma.processTemplate.findUnique.mockResolvedValueOnce({
      id: "template-1",
    } as never);
    mockPrisma.processTemplateStep.deleteMany.mockResolvedValueOnce({
      count: 0,
    } as never);
    mockPrisma.processTemplate.update.mockResolvedValueOnce({
      id: "template-1",
      steps: [],
    } as never);

    await PUT(
      makeJsonRequest("PUT", {
        name: "Updated",
        isActive: false,
        steps: [{ operationName: "Step" }],
      }),
      { params: paramsPromise }
    );

    expect(mockPrisma.processTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isActive: false,
        }),
      })
    );
  });

  it("omits isActive when not provided", async () => {
    mockPrisma.processTemplate.findUnique.mockResolvedValueOnce({
      id: "template-1",
    } as never);
    mockPrisma.processTemplateStep.deleteMany.mockResolvedValueOnce({
      count: 0,
    } as never);
    mockPrisma.processTemplate.update.mockResolvedValueOnce({
      id: "template-1",
      steps: [],
    } as never);

    await PUT(
      makeJsonRequest("PUT", {
        name: "Updated",
        steps: [{ operationName: "Step" }],
      }),
      { params: paramsPromise }
    );

    const updateCall = mockPrisma.processTemplate.update.mock.calls[0][0];
    const data = (updateCall as { data: Record<string, unknown> }).data;
    expect(data).not.toHaveProperty("isActive");
  });
});

describe("DELETE /api/admin/process-templates/[id]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await DELETE(
      makeRequest("/api/admin/process-templates/template-1"),
      { params: paramsPromise }
    );

    expect(res.status).toBe(401);
  });

  it("returns 403 when user lacks permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await DELETE(
      makeRequest("/api/admin/process-templates/template-1"),
      { params: paramsPromise }
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 404 when template not found", async () => {
    mockPrisma.processTemplate.findUnique.mockResolvedValueOnce(null);

    const res = await DELETE(
      makeRequest("/api/admin/process-templates/template-1"),
      { params: paramsPromise }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Template not found");
  });

  it("soft deletes by setting isActive to false", async () => {
    mockPrisma.processTemplate.findUnique.mockResolvedValueOnce({
      id: "template-1",
    } as never);
    mockPrisma.processTemplate.update.mockResolvedValueOnce({
      id: "template-1",
      isActive: false,
    } as never);

    const res = await DELETE(
      makeRequest("/api/admin/process-templates/template-1"),
      { params: paramsPromise }
    );

    expect(res.status).toBe(204);
    expect(mockPrisma.processTemplate.update).toHaveBeenCalledWith({
      where: { id: "template-1" },
      data: { isActive: false },
    });
  });

  it("returns empty body on successful delete", async () => {
    mockPrisma.processTemplate.findUnique.mockResolvedValueOnce({
      id: "template-1",
    } as never);
    mockPrisma.processTemplate.update.mockResolvedValueOnce({
      id: "template-1",
      isActive: false,
    } as never);

    const res = await DELETE(
      makeRequest("/api/admin/process-templates/template-1"),
      { params: paramsPromise }
    );

    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
  });
});
