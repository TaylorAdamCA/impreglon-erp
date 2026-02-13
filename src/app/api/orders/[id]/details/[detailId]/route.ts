import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { orderDetailSchema } from "@/lib/validations/order";

async function recalculateOrderTotals(orderId: string) {
  const details = await prisma.orderDetail.findMany({
    where: { orderId },
    select: { lineTotal: true },
  });
  const orderTotal = details.reduce(
    (sum, d) => sum + Number(d.lineTotal),
    0
  );

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { gstRate: true },
  });
  const gstRate = Number(order?.gstRate ?? 0);
  const gstAmount = parseFloat((orderTotal * gstRate / 100).toFixed(2));

  await prisma.order.update({
    where: { id: orderId },
    data: { orderTotal, gstAmount },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; detailId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, detailId } = await params;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "PENDING") {
    return NextResponse.json(
      { error: "Only pending orders can be edited" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const result = orderDetailSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { description, quantity, unitPrice, coating } = result.data;
  const lineTotal = Math.round(quantity * unitPrice * 100) / 100;

  const detail = await prisma.orderDetail.update({
    where: { id: detailId },
    data: {
      description,
      quantity,
      unitPrice,
      lineTotal,
      coating: coating || null,
    },
  });

  // Recalculate orderTotal + gstAmount
  await recalculateOrderTotals(id);

  return NextResponse.json(detail);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; detailId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, detailId } = await params;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "PENDING") {
    return NextResponse.json(
      { error: "Only pending orders can be edited" },
      { status: 400 }
    );
  }

  await prisma.orderDetail.delete({ where: { id: detailId } });

  // Recalculate orderTotal + gstAmount
  await recalculateOrderTotals(id);

  return new NextResponse(null, { status: 204 });
}
