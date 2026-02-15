import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "invoice_finalize");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const body = await request.json();
  if (!body.confirm) {
    return NextResponse.json(
      { error: "Confirmation required to finalize invoice" },
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

  if (order.status !== "INVOICE_APPROVED") {
    return NextResponse.json(
      { error: "Only approved invoices can be finalized" },
      { status: 400 }
    );
  }

  const now = new Date();

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "FINAL_INVOICE",
      invoiceFinalizedBy: session.user.id,
      invoiceFinalizedAt: now,
    },
  });

  await prisma.orderStatusHistory.create({
    data: {
      orderId: id,
      fromStatus: "INVOICE_APPROVED",
      toStatus: "FINAL_INVOICE",
      changedById: session.user.id,
      notes: null,
    },
  });

  return NextResponse.json(updated);
}
