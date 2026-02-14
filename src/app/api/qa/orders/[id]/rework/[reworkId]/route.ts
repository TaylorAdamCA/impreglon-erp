import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { reworkActionSchema } from "@/lib/validations/qa";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reworkId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "QA_MANAGE");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, reworkId } = await params;

  const rework = await prisma.rework.findUnique({
    where: { id: reworkId },
  });

  if (!rework || rework.orderId !== id) {
    return NextResponse.json(
      { error: "Rework item not found" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const result = reworkActionSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { action } = result.data;

  if (action === "start") {
    if (rework.status !== "PLAN_CREATED") {
      return NextResponse.json(
        { error: "Only rework items with plans can be started" },
        { status: 400 }
      );
    }

    const updated = await prisma.rework.update({
      where: { id: reworkId },
      data: { status: "IN_PROGRESS" },
    });

    return NextResponse.json(updated);
  }

  if (action === "resolve") {
    if (rework.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Only in-progress rework items can be resolved" },
        { status: 400 }
      );
    }

    const updated = await prisma.rework.update({
      where: { id: reworkId },
      data: {
        status: "RESOLVED",
        resolved: true,
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
