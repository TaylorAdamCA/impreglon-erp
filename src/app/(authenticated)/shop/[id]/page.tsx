import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ShopOrderHeader } from "@/components/shop/shop-order-header";
import { ShopReceiving } from "@/components/shop/shop-receiving";
import { ShopProcessControl } from "@/components/shop/shop-process-control";
import { ShopQaStatus } from "@/components/shop/shop-qa-status";

interface ShopOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ShopOrderDetailPage({
  params,
}: ShopOrderDetailPageProps) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, company: true } },
      details: { orderBy: { lineNumber: "asc" } },
      processSteps: {
        orderBy: { stepNumber: "asc" },
        include: { completedBy: { select: { username: true } } },
      },
      statusHistory: {
        orderBy: { changedAt: "desc" },
        include: { changedBy: { select: { username: true } } },
      },
      reworkItems: {
        include: { reworkMemo: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const serializedOrder = {
    id: order.id,
    orderNo: order.orderNo,
    orderDate: order.orderDate.toISOString(),
    shipDate: order.shipDate?.toISOString() ?? null,
    dueDate: order.dueDate?.toISOString() ?? null,
    poNumber: order.poNumber,
    status: order.status,
    processTemplate: order.processTemplate,
    customer: order.customer,
  };

  const serializedDetails = order.details.map((d) => ({
    id: d.id,
    lineNumber: d.lineNumber,
    description: d.description,
    coating: d.coating,
    quantity: d.quantity,
    unitPrice: d.unitPrice.toString(),
    receivedAt: d.receivedAt?.toISOString() ?? null,
    passedQty: d.passedQty,
    reworkQty: d.reworkQty,
  }));

  const serializedReworkItems = order.reworkItems.map((r) => ({
    id: r.id,
    reworkQty: r.reworkQty,
    status: r.status,
    resolved: r.resolved,
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
    orderDetailId: r.orderDetailId,
    reworkMemo: r.reworkMemo
      ? {
          id: r.reworkMemo.id,
          productType: r.reworkMemo.productType,
        }
      : null,
  }));

  const serializedSteps = order.processSteps.map((s) => ({
    id: s.id,
    stepNumber: s.stepNumber,
    operationName: s.operationName,
    completedAt: s.completedAt?.toISOString() ?? null,
    completedBy: s.completedBy ? { username: s.completedBy.username } : null,
    notes: s.notes,
  }));

  return (
    <div className="space-y-6">
      <ShopOrderHeader
        order={serializedOrder}
        allStepsComplete={
          serializedSteps.length > 0 &&
          serializedSteps.every((s) => s.completedAt !== null)
        }
      />

      <ShopReceiving
        orderId={order.id}
        details={serializedDetails}
        isShipped={order.status === "SHIPPED"}
      />

      <ShopProcessControl
        orderId={order.id}
        templateName={order.processTemplate}
        steps={serializedSteps}
        isShipped={order.status === "SHIPPED"}
      />

      <ShopQaStatus
        orderId={order.id}
        details={serializedDetails}
        reworkItems={serializedReworkItems}
      />
    </div>
  );
}
