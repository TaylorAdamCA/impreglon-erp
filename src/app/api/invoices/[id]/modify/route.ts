import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { invoiceModifySchema } from "@/lib/validations/invoice";

const MODIFIABLE_STATUSES = ["DRAFT_INVOICE", "INVOICE_MODIFIED"];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "invoice_modify");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const body = await request.json();
  const validation = invoiceModifySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: validation.error.issues },
      { status: 400 }
    );
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!MODIFIABLE_STATUSES.includes(order.status)) {
    return NextResponse.json(
      { error: "Only draft or modified invoices can be modified" },
      { status: 400 }
    );
  }

  const now = new Date();
  const updateData: Record<string, unknown> = {
    status: "INVOICE_MODIFIED",
    invoiceModifiedBy: session.user.id,
    invoiceModifiedAt: now,
  };

  if (validation.data.notes !== undefined) {
    updateData.invoiceNotes = validation.data.notes || null;
  }

  if (validation.data.gstOverride !== undefined) {
    updateData.gstAmount = validation.data.gstOverride;
  }

  const updated = await prisma.order.update({
    where: { id },
    data: updateData,
  });

  await prisma.orderStatusHistory.create({
    data: {
      orderId: id,
      fromStatus: order.status,
      toStatus: "INVOICE_MODIFIED",
      changedById: session.user.id,
      notes: validation.data.notes || null,
    },
  });

  return NextResponse.json(updated);
}
