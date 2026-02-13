import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { receiveItemSchema } from "@/lib/validations/shop";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "SHOP_RECEIVE");
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

  if (order.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "Only in-progress orders can receive items" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const result = receiveItemSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { detailId, received } = result.data;

  // Verify the detail belongs to this order
  const detail = await prisma.orderDetail.findUnique({
    where: { id: detailId },
  });

  if (!detail || detail.orderId !== id) {
    return NextResponse.json(
      { error: "Order detail not found" },
      { status: 404 }
    );
  }

  const updated = await prisma.orderDetail.update({
    where: { id: detailId },
    data: { receivedAt: received ? new Date() : null },
  });

  return NextResponse.json(updated);
}
