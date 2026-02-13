import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Find quote with components
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { components: { orderBy: { lineNumber: "asc" } } },
  });

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (quote.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Only approved quotes can be converted to orders" },
      { status: 400 }
    );
  }

  // Auto-increment orderNo
  const max = await prisma.order.findFirst({
    orderBy: { orderNo: "desc" },
    select: { orderNo: true },
  });
  const nextOrderNo = (max?.orderNo ?? 0) + 1;

  // Calculate totals from quote components
  const orderTotal = quote.components.reduce(
    (sum, c) => sum + Number(c.lineTotal),
    0
  );
  const gstRate = 5;
  const gstAmount = parseFloat((orderTotal * gstRate / 100).toFixed(2));

  // Create order
  const order = await prisma.order.create({
    data: {
      orderNo: nextOrderNo,
      customerId: quote.customerId,
      sourceQuoteId: quote.id,
      createdById: session.user.id,
      gstRate,
      gstAmount,
      orderTotal,
    },
  });

  // Copy quote components to order details
  for (let i = 0; i < quote.components.length; i++) {
    const comp = quote.components[i];
    await prisma.orderDetail.create({
      data: {
        orderId: order.id,
        lineNumber: i + 1,
        description: comp.description,
        quantity: comp.quantity,
        unitPrice: Number(comp.unitPrice),
        lineTotal: Number(comp.lineTotal),
        libraryType: comp.libraryType,
        libraryItemId: comp.libraryItemId,
      },
    });
  }

  // Create initial status history
  await prisma.orderStatusHistory.create({
    data: {
      orderId: order.id,
      fromStatus: null,
      toStatus: "PENDING",
      changedById: session.user.id,
    },
  });

  // Update quote status to CONVERTED
  await prisma.quote.update({
    where: { id },
    data: { status: "CONVERTED" },
  });

  return NextResponse.json(order, { status: 201 });
}
