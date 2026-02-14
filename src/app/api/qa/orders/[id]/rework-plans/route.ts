import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { reworkPlanSchema } from "@/lib/validations/qa";

export async function POST(
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
    select: { id: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const body = await request.json();
  const result = reworkPlanSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const {
    reworkId,
    productType,
    templateId,
    qaNotes,
    coatingFailure,
    methodFailure,
    operations,
    department,
  } = result.data;

  const rework = await prisma.rework.findUnique({
    where: { id: reworkId },
  });

  if (!rework || rework.orderId !== id) {
    return NextResponse.json(
      { error: "Rework item not found" },
      { status: 404 }
    );
  }

  if (rework.status !== "FLAGGED") {
    return NextResponse.json(
      { error: "Rework item already has a plan" },
      { status: 400 }
    );
  }

  const memo = await prisma.reworkMemo.create({
    data: {
      productType,
      processTemplate: templateId || null,
      qaNotes: qaNotes || null,
      coatingFailure: coatingFailure || null,
      methodFailure: methodFailure || null,
      operations: operations || null,
      department: department || null,
      createdById: session.user.id,
    },
  });

  const updated = await prisma.rework.update({
    where: { id: reworkId },
    data: {
      reworkMemoId: memo.id,
      status: "PLAN_CREATED",
    },
  });

  return NextResponse.json({ rework: updated, plan: memo }, { status: 201 });
}
