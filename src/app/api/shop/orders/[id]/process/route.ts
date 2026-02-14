import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { processStepSchema } from "@/lib/validations/shop";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "SHOP_PROCESS");
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
      { error: "Only in-progress orders can have steps completed" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const result = processStepSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { stepId, completed, notes } = result.data;

  // Find the step
  const step = await prisma.orderProcessStep.findUnique({
    where: { id: stepId },
  });

  if (!step || step.orderId !== id) {
    return NextResponse.json(
      { error: "Process step not found" },
      { status: 404 }
    );
  }

  // Enforce sequential completion
  if (completed && step.stepNumber > 1) {
    const previousSteps = await prisma.orderProcessStep.findMany({
      where: {
        orderId: id,
        stepNumber: { lt: step.stepNumber },
        completedAt: null,
      },
    });

    if (previousSteps.length > 0) {
      return NextResponse.json(
        { error: "Previous steps must be completed first" },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.orderProcessStep.update({
    where: { id: stepId },
    data: {
      completedAt: completed ? new Date() : null,
      completedById: completed ? session.user.id : null,
      notes: notes ?? null,
    },
  });

  return NextResponse.json(updated);
}
