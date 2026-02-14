import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

vi.mock("@/lib/permissions");
import { hasPermission } from "@/lib/permissions";
const mockHasPermission = vi.mocked(hasPermission);

import { PUT, DELETE } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeJsonRequest(body: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/admin/failure-types/coating/test-id"),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

function makeDeleteRequest() {
  return new NextRequest(
    new URL("http://localhost:3000/api/admin/failure-types/coating/test-id"),
    { method: "DELETE" }
  );
}

const existingFailure = {
  id: "test-id",
  code: "CF001",
  description: "Adhesion failure",
  isActive: true,
};

describe("PUT /api/admin/failure-types/[type]/[id]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await PUT(
      makeJsonRequest({ code: "CF001", description: "Updated" }),
      { params: Promise.resolve({ type: "coating", id: "test-id" }) }
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when user lacks QA_MANAGE permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await PUT(
      makeJsonRequest({ code: "CF001", description: "Updated" }),
      { params: Promise.resolve({ type: "coating", id: "test-id" }) }
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
    expect(mockHasPermission).toHaveBeenCalledWith("test-user-id", "QA_MANAGE");
  });

  it("returns 400 for invalid failure type category", async () => {
    const res = await PUT(
      makeJsonRequest({ code: "CF001", description: "Updated" }),
      { params: Promise.resolve({ type: "invalid", id: "test-id" }) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid failure type category");
  });

  it("returns 404 when failure type not found", async () => {
    mockPrisma.coatingFailure.findUnique.mockResolvedValueOnce(null as never);

    const res = await PUT(
      makeJsonRequest({ code: "CF001", description: "Updated" }),
      { params: Promise.resolve({ type: "coating", id: "nonexistent" }) }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Failure type not found");
  });

  it("returns 400 for validation failure — missing code", async () => {
    mockPrisma.coatingFailure.findUnique.mockResolvedValueOnce(
      existingFailure as never
    );

    const res = await PUT(
      makeJsonRequest({ description: "Updated" }),
      { params: Promise.resolve({ type: "coating", id: "test-id" }) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toBeDefined();
  });

  it("returns 400 for validation failure — missing description", async () => {
    mockPrisma.coatingFailure.findUnique.mockResolvedValueOnce(
      existingFailure as never
    );

    const res = await PUT(
      makeJsonRequest({ code: "CF001" }),
      { params: Promise.resolve({ type: "coating", id: "test-id" }) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("updates a coating failure successfully", async () => {
    mockPrisma.coatingFailure.findUnique.mockResolvedValueOnce(
      existingFailure as never
    );
    const updatedFailure = {
      ...existingFailure,
      code: "CF001-U",
      description: "Updated adhesion failure",
    };
    mockPrisma.coatingFailure.update.mockResolvedValueOnce(
      updatedFailure as never
    );

    const res = await PUT(
      makeJsonRequest({ code: "CF001-U", description: "Updated adhesion failure" }),
      { params: Promise.resolve({ type: "coating", id: "test-id" }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe("CF001-U");
    expect(body.description).toBe("Updated adhesion failure");
    expect(mockPrisma.coatingFailure.update).toHaveBeenCalledWith({
      where: { id: "test-id" },
      data: {
        code: "CF001-U",
        description: "Updated adhesion failure",
      },
    });
  });

  it("updates a method failure successfully", async () => {
    const existingMethod = {
      id: "mf-id",
      code: "MF001",
      description: "Bad blast",
      isActive: true,
    };
    mockPrisma.methodFailure.findUnique.mockResolvedValueOnce(
      existingMethod as never
    );
    const updatedMethod = {
      ...existingMethod,
      description: "Incorrect blast profile",
    };
    mockPrisma.methodFailure.update.mockResolvedValueOnce(
      updatedMethod as never
    );

    const res = await PUT(
      makeJsonRequest({ code: "MF001", description: "Incorrect blast profile" }),
      { params: Promise.resolve({ type: "method", id: "mf-id" }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.description).toBe("Incorrect blast profile");
    expect(mockPrisma.methodFailure.update).toHaveBeenCalledWith({
      where: { id: "mf-id" },
      data: {
        code: "MF001",
        description: "Incorrect blast profile",
      },
    });
  });

  it("updates isActive when provided", async () => {
    mockPrisma.coatingFailure.findUnique.mockResolvedValueOnce(
      existingFailure as never
    );
    const deactivated = { ...existingFailure, isActive: false };
    mockPrisma.coatingFailure.update.mockResolvedValueOnce(
      deactivated as never
    );

    const res = await PUT(
      makeJsonRequest({
        code: "CF001",
        description: "Adhesion failure",
        isActive: false,
      }),
      { params: Promise.resolve({ type: "coating", id: "test-id" }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isActive).toBe(false);
    expect(mockPrisma.coatingFailure.update).toHaveBeenCalledWith({
      where: { id: "test-id" },
      data: {
        code: "CF001",
        description: "Adhesion failure",
        isActive: false,
      },
    });
  });

  it("does not include isActive in data when not provided", async () => {
    mockPrisma.coatingFailure.findUnique.mockResolvedValueOnce(
      existingFailure as never
    );
    mockPrisma.coatingFailure.update.mockResolvedValueOnce(
      existingFailure as never
    );

    await PUT(
      makeJsonRequest({ code: "CF001", description: "Adhesion failure" }),
      { params: Promise.resolve({ type: "coating", id: "test-id" }) }
    );

    expect(mockPrisma.coatingFailure.update).toHaveBeenCalledWith({
      where: { id: "test-id" },
      data: {
        code: "CF001",
        description: "Adhesion failure",
      },
    });
  });
});

describe("DELETE /api/admin/failure-types/[type]/[id]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await DELETE(makeDeleteRequest(), {
      params: Promise.resolve({ type: "coating", id: "test-id" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when user lacks QA_MANAGE permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await DELETE(makeDeleteRequest(), {
      params: Promise.resolve({ type: "coating", id: "test-id" }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 for invalid failure type category", async () => {
    const res = await DELETE(makeDeleteRequest(), {
      params: Promise.resolve({ type: "invalid", id: "test-id" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid failure type category");
  });

  it("returns 404 when failure type not found", async () => {
    mockPrisma.coatingFailure.findUnique.mockResolvedValueOnce(null as never);

    const res = await DELETE(makeDeleteRequest(), {
      params: Promise.resolve({ type: "coating", id: "nonexistent" }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Failure type not found");
  });

  it("soft deletes a coating failure (sets isActive to false)", async () => {
    mockPrisma.coatingFailure.findUnique.mockResolvedValueOnce(
      existingFailure as never
    );
    mockPrisma.coatingFailure.update.mockResolvedValueOnce({
      ...existingFailure,
      isActive: false,
    } as never);

    const res = await DELETE(makeDeleteRequest(), {
      params: Promise.resolve({ type: "coating", id: "test-id" }),
    });

    expect(res.status).toBe(204);
    expect(mockPrisma.coatingFailure.update).toHaveBeenCalledWith({
      where: { id: "test-id" },
      data: { isActive: false },
    });
  });

  it("soft deletes a method failure (sets isActive to false)", async () => {
    const existingMethod = {
      id: "mf-id",
      code: "MF001",
      description: "Bad method",
      isActive: true,
    };
    mockPrisma.methodFailure.findUnique.mockResolvedValueOnce(
      existingMethod as never
    );
    mockPrisma.methodFailure.update.mockResolvedValueOnce({
      ...existingMethod,
      isActive: false,
    } as never);

    const res = await DELETE(makeDeleteRequest(), {
      params: Promise.resolve({ type: "method", id: "mf-id" }),
    });

    expect(res.status).toBe(204);
    expect(mockPrisma.methodFailure.update).toHaveBeenCalledWith({
      where: { id: "mf-id" },
      data: { isActive: false },
    });
  });
});
