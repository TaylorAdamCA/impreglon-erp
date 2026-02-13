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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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

  const { description, quantity, coating, libraryType, libraryItemId, coatingSlot } =
    result.data;
  let { unitPrice } = result.data;

  // Auto-increment lineNumber
  const max = await prisma.orderDetail.findFirst({
    where: { orderId: id },
    orderBy: { lineNumber: "desc" },
    select: { lineNumber: true },
  });
  const lineNumber = (max?.lineNumber ?? 0) + 1;

  // Look up coating price from library item when coatingSlot provided
  if (libraryItemId && coatingSlot) {
    const product = await prisma.productLibraryItem.findUnique({
      where: { id: libraryItemId },
      select: {
        coatingPrice1: true,
        coatingPrice2: true,
        coatingPrice3: true,
        coatingPrice4: true,
        coatingPrice5: true,
        coatingPrice6: true,
        coatingPrice7: true,
        coatingPrice8: true,
      },
    });

    if (product) {
      const priceField = ("coatingPrice" + coatingSlot) as keyof typeof product;
      const price = product[priceField];
      if (price != null) {
        unitPrice = Number(price);
      }
    }
  }

  const lineTotal = Math.round(quantity * unitPrice * 100) / 100;

  const detail = await prisma.orderDetail.create({
    data: {
      orderId: id,
      lineNumber,
      description,
      quantity,
      unitPrice,
      lineTotal,
      coating: coating || null,
      libraryType: libraryType || null,
      libraryItemId: libraryItemId || null,
    },
  });

  // Recalculate orderTotal + gstAmount
  await recalculateOrderTotals(id);

  return NextResponse.json(detail, { status: 201 });
}
