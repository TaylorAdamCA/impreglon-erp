import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { QaOrderHeader } from "@/components/qa/qa-order-header";
import { QaInspectionTable } from "@/components/qa/qa-inspection-table";
import { ReworkSection } from "@/components/qa/rework-section";

interface QaOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function QaOrderDetailPage({
  params,
}: QaOrderDetailPageProps) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const allowed = await hasPermission(session.user.id, "QA_MANAGE");
  if (!allowed) redirect("/");

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, company: true } },
      details: { orderBy: { lineNumber: "asc" } },
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
    poNumber: order.poNumber,
    status: order.status,
    customer: order.customer,
  };

  const serializedDetails = order.details.map((d) => ({
    id: d.id,
    lineNumber: d.lineNumber,
    description: d.description,
    quantity: d.quantity,
    passedQty: d.passedQty,
    reworkQty: d.reworkQty,
    coating: d.coating,
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
          planNo: r.reworkMemo.planNo,
          productType: r.reworkMemo.productType,
          processTemplate: r.reworkMemo.processTemplate,
          qaNotes: r.reworkMemo.qaNotes,
          coatingFailure: r.reworkMemo.coatingFailure,
          methodFailure: r.reworkMemo.methodFailure,
          operations: r.reworkMemo.operations,
          department: r.reworkMemo.department,
        }
      : null,
  }));

  const allPassed = serializedDetails.every((d) => d.passedQty >= d.quantity);
  const hasUnresolvedRework = serializedReworkItems.some((r) => !r.resolved);
  const allReworkResolved =
    serializedReworkItems.length > 0 &&
    serializedReworkItems.every((r) => r.resolved);

  return (
    <div className="space-y-6">
      <QaOrderHeader
        order={serializedOrder}
        allPassed={allPassed}
        hasUnresolvedRework={hasUnresolvedRework}
        allReworkResolved={allReworkResolved}
      />

      <QaInspectionTable
        orderId={order.id}
        details={serializedDetails}
        disabled={order.status === "REWORK" || order.status === "SHIPPED"}
      />

      <ReworkSection
        orderId={order.id}
        reworkItems={serializedReworkItems}
        details={serializedDetails.map((d) => ({
          id: d.id,
          lineNumber: d.lineNumber,
          description: d.description,
        }))}
        disabled={order.status === "SHIPPED"}
      />
    </div>
  );
}
