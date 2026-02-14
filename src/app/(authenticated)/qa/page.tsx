import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { QaOrderList } from "@/components/qa/qa-order-list";

export default async function QaPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const allowed = await hasPermission(session.user.id, "QA_MANAGE");
  if (!allowed) redirect("/");

  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["IN_PROGRESS", "REWORK"] },
    },
    include: {
      customer: { select: { company: true } },
      details: { select: { quantity: true, passedQty: true, reworkQty: true } },
      reworkItems: { select: { id: true, resolved: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = orders.map((order) => ({
    id: order.id,
    orderNo: order.orderNo,
    customerName: order.customer.company,
    poNumber: order.poNumber,
    status: order.status,
    totalQty: order.details.reduce((sum, d) => sum + d.quantity, 0),
    passedQty: order.details.reduce((sum, d) => sum + d.passedQty, 0),
    unresolvedRework: order.reworkItems.filter((r) => !r.resolved).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">QA Queue</h1>
        <p className="mt-1 text-muted-foreground">
          {serialized.length} order{serialized.length !== 1 ? "s" : ""} awaiting
          inspection
        </p>
      </div>
      <QaOrderList orders={serialized} />
    </div>
  );
}
