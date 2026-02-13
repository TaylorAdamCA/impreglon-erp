import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateOrderSchema } from "@/lib/validations/order";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, company: true } },
      createdBy: { select: { username: true } },
      details: { orderBy: { lineNumber: "asc" } },
      statusHistory: {
        orderBy: { changedAt: "desc" },
        include: { changedBy: { select: { username: true } } },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (existing.status !== "PENDING") {
    return NextResponse.json(
      { error: "Only pending orders can be edited" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const result = updateOrderSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {
    customerId: result.data.customerId,
    poNumber: result.data.poNumber || null,
    shipDate: result.data.shipDate ? new Date(result.data.shipDate) : null,
    dueDate: result.data.dueDate ? new Date(result.data.dueDate) : null,
    gstRate: result.data.gstRate,
  };

  // Recalculate GST if rate changed
  if (result.data.gstRate !== Number(existing.gstRate)) {
    data.gstAmount = parseFloat(
      (Number(existing.orderTotal) * result.data.gstRate / 100).toFixed(2)
    );
  }

  const order = await prisma.order.update({
    where: { id },
    data,
  });

  return NextResponse.json(order);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (existing.status !== "PENDING") {
    return NextResponse.json(
      { error: "Only pending orders can be deleted" },
      { status: 400 }
    );
  }

  await prisma.order.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
