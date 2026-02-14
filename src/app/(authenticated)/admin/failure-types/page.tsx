import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { FailureTypeList } from "@/components/admin/failure-type-list";

export default async function FailureTypesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const allowed = await hasPermission(session.user.id, "QA_MANAGE");
  if (!allowed) {
    redirect("/");
  }

  const [coatingFailures, methodFailures] = await Promise.all([
    prisma.coatingFailure.findMany({ orderBy: { code: "asc" } }),
    prisma.methodFailure.findMany({ orderBy: { code: "asc" } }),
  ]);

  const serialized = {
    coatingFailures: coatingFailures.map((f) => ({
      id: f.id,
      code: f.code,
      description: f.description,
      isActive: f.isActive,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })),
    methodFailures: methodFailures.map((f) => ({
      id: f.id,
      code: f.code,
      description: f.description,
      isActive: f.isActive,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Failure Types</h1>
        <p className="mt-1 text-muted-foreground">
          Manage coating and method failure classifications for QA rework
        </p>
      </div>

      <FailureTypeList {...serialized} />
    </div>
  );
}
