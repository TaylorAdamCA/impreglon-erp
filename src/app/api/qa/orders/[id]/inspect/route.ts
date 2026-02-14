import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { inspectItemSchema } from "@/lib/validations/qa";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "QA_MANAGE");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "IN_PROGRESS" && order.status !== "REWORK") {
    return NextResponse.json(
      { error: "Only in-progress or rework orders can be inspected" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const result = inspectItemSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { detailId, currentPass, reworkQty } = result.data;

  const detail = await prisma.orderDetail.findUnique({
    where: { id: detailId },
  });

  if (!detail || detail.orderId !== id) {
    return NextResponse.json(
      { error: "Order detail not found" },
      { status: 404 }
    );
  }

  // Validate quantity constraint
  const remaining = detail.quantity - detail.passedQty - detail.reworkQty;
  const totalInspected = currentPass + (reworkQty ?? 0);

  if (totalInspected > remaining) {
    return NextResponse.json(
      { error: "Inspection quantity exceeds remaining uninspected items" },
      { status: 400 }
    );
  }

  // Update the detail
  const updated = await prisma.orderDetail.update({
    where: { id: detailId },
    data: {
      currentPass,
      passedQty: detail.passedQty + currentPass,
      reworkQty: detail.reworkQty + (reworkQty ?? 0),
    },
  });

  // Create rework record if items flagged
  if (reworkQty && reworkQty > 0) {
    await prisma.rework.create({
      data: {
        orderId: id,
        orderDetailId: detailId,
        reworkQty,
        status: "FLAGGED",
      },
    });
  }

  return NextResponse.json(updated);
}
