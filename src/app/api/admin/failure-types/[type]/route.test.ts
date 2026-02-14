import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

vi.mock("@/lib/permissions");
import { hasPermission } from "@/lib/permissions";
const mockHasPermission = vi.mocked(hasPermission);

import { POST } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

function makeJsonRequest(body: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/admin/failure-types/coating"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

describe("POST /api/admin/failure-types/[type]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await POST(
      makeJsonRequest({ code: "CF001", description: "Test" }),
      { params: Promise.resolve({ type: "coating" }) }
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when user lacks QA_MANAGE permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await POST(
      makeJsonRequest({ code: "CF001", description: "Test" }),
      { params: Promise.resolve({ type: "coating" }) }
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
    expect(mockHasPermission).toHaveBeenCalledWith("test-user-id", "QA_MANAGE");
  });

  it("returns 400 for invalid failure type category", async () => {
    const res = await POST(
      makeJsonRequest({ code: "CF001", description: "Test" }),
      { params: Promise.resolve({ type: "invalid" }) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid failure type category");
  });

  it("returns 400 for validation failure — missing code", async () => {
    const res = await POST(
      makeJsonRequest({ description: "Test" }),
      { params: Promise.resolve({ type: "coating" }) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toBeDefined();
  });

  it("returns 400 for validation failure — missing description", async () => {
    const res = await POST(
      makeJsonRequest({ code: "CF001" }),
      { params: Promise.resolve({ type: "coating" }) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 400 for validation failure — empty code", async () => {
    const res = await POST(
      makeJsonRequest({ code: "", description: "Test" }),
      { params: Promise.resolve({ type: "coating" }) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("creates a coating failure successfully", async () => {
    const mockCreated = {
      id: "new-cf",
      code: "CF001",
      description: "Coating adhesion failure",
      isActive: true,
    };
    mockPrisma.coatingFailure.create.mockResolvedValueOnce(mockCreated as never);

    const res = await POST(
      makeJsonRequest({ code: "CF001", description: "Coating adhesion failure" }),
      { params: Promise.resolve({ type: "coating" }) }
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.code).toBe("CF001");
    expect(body.description).toBe("Coating adhesion failure");
    expect(mockPrisma.coatingFailure.create).toHaveBeenCalledWith({
      data: {
        code: "CF001",
        description: "Coating adhesion failure",
      },
    });
  });

  it("creates a method failure successfully", async () => {
    const mockCreated = {
      id: "new-mf",
      code: "MF001",
      description: "Incorrect blast profile",
      isActive: true,
    };
    mockPrisma.methodFailure.create.mockResolvedValueOnce(mockCreated as never);

    const res = await POST(
      makeJsonRequest({ code: "MF001", description: "Incorrect blast profile" }),
      { params: Promise.resolve({ type: "method" }) }
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.code).toBe("MF001");
    expect(body.description).toBe("Incorrect blast profile");
    expect(mockPrisma.methodFailure.create).toHaveBeenCalledWith({
      data: {
        code: "MF001",
        description: "Incorrect blast profile",
      },
    });
  });
});
