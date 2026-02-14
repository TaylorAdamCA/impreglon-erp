import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { assignTemplateSchema } from "@/lib/validations/shop";

export async function POST(
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
    select: { id: true, status: true, processTemplate: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "Only in-progress orders can be assigned templates" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const result = assignTemplateSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { templateId } = result.data;

  const template = await prisma.processTemplate.findUnique({
    where: { id: templateId },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  });

  if (!template || !template.isActive) {
    return NextResponse.json(
      { error: "Template not found or inactive" },
      { status: 404 }
    );
  }

  // Delete existing process steps for this order (reassignment)
  await prisma.orderProcessStep.deleteMany({ where: { orderId: id } });

  // Create snapshot of template steps
  for (const step of template.steps) {
    await prisma.orderProcessStep.create({
      data: {
        orderId: id,
        templateStepId: step.id,
        stepNumber: step.stepNumber,
        operationName: step.operationName,
      },
    });
  }

  // Store template ID on order
  const updated = await prisma.order.update({
    where: { id },
    data: { processTemplate: templateId },
    include: {
      processSteps: { orderBy: { stepNumber: "asc" } },
    },
  });

  return NextResponse.json(updated);
}
