import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ShopOrderList } from "@/components/shop/shop-order-list";

export default async function ShopPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["IN_PROGRESS", "READY_TO_SHIP", "SHIPPED"] },
    },
    include: {
      customer: { select: { company: true } },
      details: { select: { id: true, receivedAt: true } },
      processSteps: {
        select: { id: true, completedAt: true },
        orderBy: { stepNumber: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = orders.map((order) => ({
    id: order.id,
    orderNo: order.orderNo,
    customerName: order.customer.company,
    poNumber: order.poNumber,
    status: order.status,
    orderDate: order.orderDate.toISOString(),
    totalItems: order.details.length,
    receivedItems: order.details.filter((d) => d.receivedAt !== null).length,
    totalSteps: order.processSteps.length,
    completedSteps: order.processSteps.filter((s) => s.completedAt !== null)
      .length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Shop Floor</h1>
        <p className="mt-1 text-muted-foreground">
          {serialized.length} order{serialized.length !== 1 ? "s" : ""} in
          production
        </p>
      </div>
      <ShopOrderList orders={serialized} />
    </div>
  );
}
