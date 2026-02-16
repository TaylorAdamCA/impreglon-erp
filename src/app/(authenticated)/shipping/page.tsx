import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ShippingOrderList } from "@/components/shipping/shipping-order-list";

export default async function ShippingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const allowed = await hasPermission(session.user.id, "shipping");
  if (!allowed) redirect("/");

  const orders = await prisma.order.findMany({
    where: {
      status: "READY_TO_SHIP",
    },
    include: {
      customer: { select: { id: true, company: true } },
      details: { select: { quantity: true } },
      shipToAddress: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = orders.map((order) => ({
    id: order.id,
    orderNo: order.orderNo,
    customerName: order.customer.company,
    customerId: order.customer.id,
    poNumber: order.poNumber,
    itemCount: order.details.reduce((sum, d) => sum + d.quantity, 0),
    orderDate: order.orderDate.toISOString(),
    shipToAddress: order.shipToAddress
      ? {
          id: order.shipToAddress.id,
          name: order.shipToAddress.name,
          city: order.shipToAddress.city,
        }
      : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Shipping Queue</h1>
        <p className="mt-1 text-muted-foreground">
          {serialized.length} order{serialized.length !== 1 ? "s" : ""} ready to
          ship
        </p>
      </div>
      <ShippingOrderList orders={serialized} />
    </div>
  );
}
