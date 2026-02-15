import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { ToolDetail } from "@/components/tools/tool-detail";

interface ToolDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ToolDetailPage({ params }: ToolDetailPageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const canView = await hasPermission(session.user.id, "tool_view");
  if (!canView) redirect("/dashboard");

  const [canModify, canReceive] = await Promise.all([
    hasPermission(session.user.id, "tool_modify"),
    hasPermission(session.user.id, "tool_receive"),
  ]);

  const tool = await prisma.tool.findUnique({
    where: { id },
    include: {
      parts: { orderBy: { partNo: "asc" } },
      assignments: {
        include: {
          order: { select: { id: true, orderNo: true, customer: { select: { company: true } } } },
        },
        orderBy: { createdAt: "desc" },
      },
      receipts: { orderBy: { receivedAt: "desc" } },
    },
  });

  if (!tool) notFound();

  // Serialize Decimals and Dates
  const serialized = {
    id: tool.id,
    toolNo: tool.toolNo,
    description: tool.description,
    toolType: tool.toolType,
    status: tool.status,
    price: tool.price ? tool.price.toString() : null,
    owner: tool.owner,
    location: tool.location,
    isProprietary: tool.isProprietary,
    parts: tool.parts.map((p) => ({
      id: p.id, partNo: p.partNo, description: p.description,
      price: p.price ? p.price.toString() : null, quantity: p.quantity,
    })),
    assignments: tool.assignments.map((a) => ({
      id: a.id, assignment: a.assignment, createdAt: a.createdAt.toISOString(),
      order: { id: a.order.id, orderNo: a.order.orderNo, company: a.order.customer.company },
    })),
    receipts: tool.receipts.map((r) => ({
      id: r.id, receivedBy: r.receivedBy, receivedAt: r.receivedAt.toISOString(),
      condition: r.condition, notes: r.notes,
    })),
  };

  return <ToolDetail tool={serialized} canModify={canModify} canReceive={canReceive} />;
}
