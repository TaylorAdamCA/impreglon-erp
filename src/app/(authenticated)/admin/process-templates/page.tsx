import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ProcessTemplateList } from "@/components/admin/process-template-list";

export default async function ProcessTemplatesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const allowed = await hasPermission(
    session.user.id,
    "PROCESS_TEMPLATES_MANAGE"
  );
  if (!allowed) {
    redirect("/");
  }

  const templates = await prisma.processTemplate.findMany({
    include: { steps: { orderBy: { stepNumber: "asc" } } },
    orderBy: { name: "asc" },
  });

  // Serialize dates to ISO strings for the client component
  const serializedTemplates = templates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    isActive: template.isActive,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
    steps: template.steps.map((step) => ({
      id: step.id,
      stepNumber: step.stepNumber,
      operationName: step.operationName,
      description: step.description,
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Process Templates</h1>
        <p className="mt-1 text-muted-foreground">
          Define reusable manufacturing process templates for shop orders
        </p>
      </div>

      <ProcessTemplateList templates={serializedTemplates} />
    </div>
  );
}
