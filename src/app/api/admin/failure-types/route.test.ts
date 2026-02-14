import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

vi.mock("@/lib/permissions");
import { hasPermission } from "@/lib/permissions";
const mockHasPermission = vi.mocked(hasPermission);

import { GET } from "./route";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

const sampleCoatingFailures = [
  { id: "cf1", code: "CF001", description: "Adhesion failure", isActive: true },
  { id: "cf2", code: "CF002", description: "Thickness out of spec", isActive: true },
];

const sampleMethodFailures = [
  { id: "mf1", code: "MF001", description: "Incorrect blast profile", isActive: true },
  { id: "mf2", code: "MF002", description: "Wrong temperature", isActive: true },
];

describe("GET /api/admin/failure-types", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await GET();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when user lacks QA_MANAGE permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const res = await GET();

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
    expect(mockHasPermission).toHaveBeenCalledWith("test-user-id", "QA_MANAGE");
  });

  it("returns 200 with both coating and method failure lists", async () => {
    mockPrisma.coatingFailure.findMany.mockResolvedValueOnce(
      sampleCoatingFailures as never
    );
    mockPrisma.methodFailure.findMany.mockResolvedValueOnce(
      sampleMethodFailures as never
    );

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.coatingFailures).toHaveLength(2);
    expect(body.methodFailures).toHaveLength(2);
    expect(body.coatingFailures[0].code).toBe("CF001");
    expect(body.methodFailures[0].code).toBe("MF001");
  });

  it("orders results by code ascending", async () => {
    mockPrisma.coatingFailure.findMany.mockResolvedValueOnce([] as never);
    mockPrisma.methodFailure.findMany.mockResolvedValueOnce([] as never);

    await GET();

    expect(mockPrisma.coatingFailure.findMany).toHaveBeenCalledWith({
      orderBy: { code: "asc" },
    });
    expect(mockPrisma.methodFailure.findMany).toHaveBeenCalledWith({
      orderBy: { code: "asc" },
    });
  });

  it("returns empty arrays when no failure types exist", async () => {
    mockPrisma.coatingFailure.findMany.mockResolvedValueOnce([] as never);
    mockPrisma.methodFailure.findMany.mockResolvedValueOnce([] as never);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.coatingFailures).toEqual([]);
    expect(body.methodFailures).toEqual([]);
  });
});
