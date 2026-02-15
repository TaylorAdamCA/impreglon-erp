import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, getUserPermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { InvoiceDetail } from "@/components/invoices/invoice-detail";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const allowed = await hasPermission(session.user.id, "invoice_view");
  if (!allowed) redirect("/");

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, company: true, custNo: true } },
      details: { orderBy: { lineNumber: "asc" } },
      statusHistory: {
        orderBy: { changedAt: "desc" },
        include: { changedBy: { select: { username: true } } },
      },
    },
  });

  if (!order) notFound();

  const permissions = await getUserPermissions(session.user.id);

  const serialized = {
    id: order.id,
    orderNo: order.orderNo,
    invoiceNo: order.invoiceNo,
    invoiceDate: order.invoiceDate?.toISOString() ?? null,
    status: order.status,
    orderTotal: Number(order.orderTotal),
    gstAmount: Number(order.gstAmount),
    gstRate: order.gstRate ? Number(order.gstRate) : null,
    invoiceNotes: order.invoiceNotes,
    invoiceDraftedBy: order.invoiceDraftedBy,
    invoiceDraftedAt: order.invoiceDraftedAt?.toISOString() ?? null,
    invoiceModifiedAt: order.invoiceModifiedAt?.toISOString() ?? null,
    invoiceApprovedAt: order.invoiceApprovedAt?.toISOString() ?? null,
    invoiceFinalizedAt: order.invoiceFinalizedAt?.toISOString() ?? null,
    poNumber: order.poNumber,
    customer: order.customer,
    details: order.details.map((d) => ({
      id: d.id,
      lineNumber: d.lineNumber,
      description: d.description,
      quantity: d.quantity,
      unitPrice: Number(d.unitPrice),
      lineTotal: Number(d.lineTotal),
      coating: d.coating,
    })),
    statusHistory: order.statusHistory.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      changedAt: h.changedAt.toISOString(),
      changedBy: h.changedBy.username,
      notes: h.notes,
    })),
  };

  return (
    <InvoiceDetail
      order={serialized}
      permissions={permissions}
      currentUserId={session.user.id}
    />
  );
}
