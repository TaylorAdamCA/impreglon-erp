import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { orderStatusSchema } from "@/lib/validations/order";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json();
  const result = orderStatusSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
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

  const { action, notes } = result.data;

  if (action === "start") {
    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending orders can be started" },
        { status: 400 }
      );
    }

    const detailCount = await prisma.orderDetail.count({
      where: { orderId: id },
    });

    if (detailCount === 0) {
      return NextResponse.json(
        { error: "Cannot start an order with no line items" },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: order.status,
        toStatus: "IN_PROGRESS",
        changedById: session.user.id,
        notes: notes || null,
      },
    });

    return NextResponse.json(updated);
  }

  if (action === "complete") {
    if (order.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Only in-progress orders can be completed" },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: "READY_TO_SHIP" },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: order.status,
        toStatus: "READY_TO_SHIP",
        changedById: session.user.id,
        notes: notes || null,
      },
    });

    return NextResponse.json(updated);
  }

  if (action === "ready") {
    if (order.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Only in-progress orders can be marked ready to ship" },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: "READY_TO_SHIP" },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: "IN_PROGRESS",
        toStatus: "READY_TO_SHIP",
        changedById: session.user.id,
        notes: notes || null,
      },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json(
    { error: "Validation failed" },
    { status: 400 }
  );
}
