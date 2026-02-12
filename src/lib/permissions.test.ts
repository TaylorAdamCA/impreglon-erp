import { describe, it, expect, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getUserPermissions, hasPermission } from "./permissions";

const mockPrisma = vi.mocked(prisma);

describe("getUserPermissions", () => {
  it("returns deduplicated permissions from all user roles", async () => {
    mockPrisma.userRole.findMany.mockResolvedValueOnce([
      {
        role: {
          permissions: [{ code: "ORDERS_VIEW" }, { code: "ORDERS_EDIT" }],
        },
      },
      {
        role: {
          permissions: [{ code: "ORDERS_VIEW" }, { code: "CUSTOMERS_VIEW" }],
        },
      },
    ] as never);

    const perms = await getUserPermissions("user-1");

    expect(perms).toEqual(
      expect.arrayContaining(["ORDERS_VIEW", "ORDERS_EDIT", "CUSTOMERS_VIEW"])
    );
    expect(perms).toHaveLength(3);
  });

  it("returns empty array when user has no roles", async () => {
    mockPrisma.userRole.findMany.mockResolvedValueOnce([]);

    const perms = await getUserPermissions("user-no-roles");

    expect(perms).toEqual([]);
  });

  it("returns empty array when roles have no permissions", async () => {
    mockPrisma.userRole.findMany.mockResolvedValueOnce([
      { role: { permissions: [] } },
    ] as never);

    const perms = await getUserPermissions("user-empty-perms");

    expect(perms).toEqual([]);
  });

  it("calls prisma with correct userId and includes", async () => {
    mockPrisma.userRole.findMany.mockResolvedValueOnce([]);

    await getUserPermissions("user-123");

    expect(mockPrisma.userRole.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      include: { role: { include: { permissions: true } } },
    });
  });
});

describe("hasPermission", () => {
  it("returns true when user has the permission", async () => {
    mockPrisma.userRole.findMany.mockResolvedValueOnce([
      { role: { permissions: [{ code: "ORDERS_VIEW" }] } },
    ] as never);

    const result = await hasPermission("user-1", "ORDERS_VIEW");

    expect(result).toBe(true);
  });

  it("returns false when user lacks the permission", async () => {
    mockPrisma.userRole.findMany.mockResolvedValueOnce([
      { role: { permissions: [{ code: "ORDERS_VIEW" }] } },
    ] as never);

    const result = await hasPermission("user-1", "ADMIN_PANEL");

    expect(result).toBe(false);
  });

  it("returns false when user has no roles", async () => {
    mockPrisma.userRole.findMany.mockResolvedValueOnce([]);

    const result = await hasPermission("user-1", "ORDERS_VIEW");

    expect(result).toBe(false);
  });
});
