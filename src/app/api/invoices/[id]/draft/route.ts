import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { invoiceDraftSchema } from "@/lib/validations/invoice";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "invoice_draft");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const body = await request.json();
  const validation = invoiceDraftSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: validation.error.issues },
      { status: 400 }
    );
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, status: true, orderDate: true, orderTotal: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "SHIPPED") {
    return NextResponse.json(
      { error: "Only shipped orders can be invoiced" },
      { status: 400 }
    );
  }

  // Auto-increment invoiceNo
  const maxInvoice = await prisma.order.findFirst({
    where: { invoiceNo: { not: null } },
    orderBy: { invoiceNo: "desc" },
    select: { invoiceNo: true },
  });
  const nextInvoiceNo = (maxInvoice?.invoiceNo ?? 0) + 1;

  // Lookup GST rate by order date
  const taxRate = await prisma.taxRate.findFirst({
    where: {
      taxId: "GST",
      effectiveDate: { lte: order.orderDate },
      expiryDate: { gte: order.orderDate },
    },
  });

  const gstRate = taxRate ? Number(taxRate.rate) : 0;
  const orderTotal = Number(order.orderTotal);
  const gstAmount =
    validation.data.gstOverride !== undefined
      ? validation.data.gstOverride
      : Math.round(orderTotal * (gstRate / 100) * 100) / 100;

  const now = new Date();

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "DRAFT_INVOICE",
      invoiceNo: nextInvoiceNo,
      invoiceDate: now,
      invoiceDraftedBy: session.user.id,
      invoiceDraftedAt: now,
      invoiceNotes: validation.data.notes || null,
      gstRate,
      gstAmount,
    },
  });

  await prisma.orderStatusHistory.create({
    data: {
      orderId: id,
      fromStatus: "SHIPPED",
      toStatus: "DRAFT_INVOICE",
      changedById: session.user.id,
      notes: validation.data.notes || null,
    },
  });

  return NextResponse.json(updated);
}
