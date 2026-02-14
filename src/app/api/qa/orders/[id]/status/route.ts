import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { qaStatusSchema } from "@/lib/validations/qa";

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

  const body = await request.json();
  const result = qaStatusSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      details: { select: { quantity: true, passedQty: true, reworkQty: true } },
      reworkItems: { select: { resolved: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { action, notes } = result.data;

  if (action === "rework") {
    if (order.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Only in-progress orders can be sent to rework" },
        { status: 400 }
      );
    }

    const hasRework = order.reworkItems.some((r) => !r.resolved);
    if (!hasRework) {
      return NextResponse.json(
        { error: "No unresolved rework items exist" },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: "REWORK" },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: "IN_PROGRESS",
        toStatus: "REWORK",
        changedById: session.user.id,
        notes: notes || null,
      },
    });

    return NextResponse.json(updated);
  }

  if (action === "pass") {
    if (order.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Only in-progress orders can pass QA" },
        { status: 400 }
      );
    }

    const allPassed = order.details.every(
      (d) => d.passedQty >= d.quantity
    );
    if (!allPassed) {
      return NextResponse.json(
        { error: "Not all items have passed inspection" },
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

  if (action === "return") {
    if (order.status !== "REWORK") {
      return NextResponse.json(
        { error: "Only rework orders can be returned to QA" },
        { status: 400 }
      );
    }

    const allResolved = order.reworkItems.every((r) => r.resolved);
    if (!allResolved) {
      return NextResponse.json(
        { error: "Not all rework items are resolved" },
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
        fromStatus: "REWORK",
        toStatus: "IN_PROGRESS",
        changedById: session.user.id,
        notes: notes || null,
      },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
