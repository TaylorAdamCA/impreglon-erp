import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { InvoiceList } from "@/components/invoices/invoice-list";
import type { OrderStatus } from "@/generated/prisma/client";

const INVOICE_STATUSES: OrderStatus[] = [
  "DRAFT_INVOICE",
  "INVOICE_MODIFIED",
  "INVOICE_APPROVED",
  "FINAL_INVOICE",
];

export default async function InvoicesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const allowed = await hasPermission(session.user.id, "invoice_view");
  if (!allowed) redirect("/");

  const orders = await prisma.order.findMany({
    where: { status: { in: INVOICE_STATUSES } },
    include: {
      customer: { select: { company: true } },
    },
    orderBy: { invoiceDate: "desc" },
  });

  const serialized = orders.map((order) => ({
    id: order.id,
    orderNo: order.orderNo,
    invoiceNo: order.invoiceNo,
    invoiceDate: order.invoiceDate?.toISOString() ?? null,
    customerName: order.customer.company,
    status: order.status,
    orderTotal: Number(order.orderTotal),
    gstAmount: Number(order.gstAmount),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <p className="mt-1 text-muted-foreground">
          {serialized.length} invoice{serialized.length !== 1 ? "s" : ""}
        </p>
      </div>
      <InvoiceList invoices={serialized} />
    </div>
  );
}
