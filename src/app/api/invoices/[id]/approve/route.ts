import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

const APPROVABLE_STATUSES = ["DRAFT_INVOICE", "INVOICE_MODIFIED"];

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "invoice_approve");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, status: true, invoiceDraftedBy: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!APPROVABLE_STATUSES.includes(order.status)) {
    return NextResponse.json(
      { error: "Only draft or modified invoices can be approved" },
      { status: 400 }
    );
  }

  const now = new Date();

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "INVOICE_APPROVED",
      invoiceApprovedBy: session.user.id,
      invoiceApprovedAt: now,
    },
  });

  await prisma.orderStatusHistory.create({
    data: {
      orderId: id,
      fromStatus: order.status,
      toStatus: "INVOICE_APPROVED",
      changedById: session.user.id,
      notes: null,
    },
  });

  const sameUser = order.invoiceDraftedBy === session.user.id;

  return NextResponse.json({
    ...updated,
    ...(sameUser
      ? { warning: "Invoice was approved by the same user who drafted it" }
      : {}),
  });
}
