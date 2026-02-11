import { prisma } from "@/lib/prisma";

export async function getUserPermissions(userId: string): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: { permissions: true },
      },
    },
  });

  const permissions = userRoles.flatMap((ur) =>
    ur.role.permissions.map((p) => p.code)
  );

  return [...new Set(permissions)];
}

export async function hasPermission(
  userId: string,
  permissionCode: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permissionCode);
}
