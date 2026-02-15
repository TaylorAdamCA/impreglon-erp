import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ToolList } from "@/components/tools/tool-list";

export default async function ToolsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const allowed = await hasPermission(session.user.id, "tool_view");
  if (!allowed) redirect("/dashboard");

  const canCreate = await hasPermission(session.user.id, "tool_create");

  const tools = await prisma.tool.findMany({
    orderBy: { toolNo: "asc" },
  });

  const serialized = tools.map((tool) => ({
    id: tool.id,
    toolNo: tool.toolNo,
    description: tool.description,
    toolType: tool.toolType,
    status: tool.status,
    price: tool.price ? tool.price.toString() : null,
    owner: tool.owner,
    location: tool.location,
    isProprietary: tool.isProprietary,
  }));

  return (
    <div className="space-y-6">
      <ToolList tools={serialized} canCreate={canCreate} />
    </div>
  );
}
