import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { OrderHeader } from "@/components/orders/order-header";
import { OrderDetail } from "@/components/orders/order-detail";
import { OrderStatusHistory } from "@/components/orders/order-status-history";
import { OrderTools } from "@/components/orders/order-tools";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) {
    notFound();
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, company: true } },
      createdBy: { select: { username: true } },
      details: { orderBy: { lineNumber: "asc" } },
      statusHistory: {
        orderBy: { changedAt: "desc" },
        include: { changedBy: { select: { username: true } } },
      },
      toolAssignments: {
        include: {
          tool: { select: { id: true, toolNo: true, description: true, status: true, isProprietary: true } },
        },
        orderBy: { createdAt: "desc" as const },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const isPending = order.status === "PENDING";

  return (
    <div className="space-y-6">
      <OrderHeader
        order={{
          id: order.id,
          orderNo: order.orderNo,
          orderDate: order.orderDate.toISOString(),
          shipDate: order.shipDate?.toISOString() ?? null,
          dueDate: order.dueDate?.toISOString() ?? null,
          poNumber: order.poNumber,
          status: order.status,
          orderTotal: order.orderTotal.toString(),
          gstAmount: order.gstAmount.toString(),
          gstRate: order.gstRate?.toString() ?? null,
          customer: order.customer,
          createdBy: order.createdBy,
          sourceQuoteId: order.sourceQuoteId,
        }}
      />

      <OrderDetail
        orderId={order.id}
        details={order.details.map((d) => ({
          id: d.id,
          lineNumber: d.lineNumber,
          description: d.description,
          coating: d.coating,
          libraryType: d.libraryType,
          quantity: d.quantity,
          unitPrice: d.unitPrice.toString(),
          lineTotal: d.lineTotal.toString(),
        }))}
        isPending={isPending}
      />

      <OrderStatusHistory
        history={order.statusHistory.map((h) => ({
          id: h.id,
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          changedAt: h.changedAt.toISOString(),
          changedBy: h.changedBy,
          notes: h.notes,
        }))}
      />

      <OrderTools
        orderId={order.id}
        assignments={order.toolAssignments.map((a: { id: string; assignment: string | null; tool: { id: string; toolNo: number; description: string; status: string; isProprietary: boolean } }) => ({
          id: a.id,
          assignment: a.assignment,
          tool: {
            id: a.tool.id,
            toolNo: a.tool.toolNo,
            description: a.tool.description,
            status: a.tool.status,
            isProprietary: a.tool.isProprietary,
          },
        }))}
      />
    </div>
  );
}
