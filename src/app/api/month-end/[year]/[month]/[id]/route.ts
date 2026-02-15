import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { updatePercentSchema } from "@/lib/validations/month-end";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string; id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "monthend"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const result = updatePercentSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const snapshot = await prisma.monthEndSnapshot.findUnique({
    where: { id },
    select: { orderTotal: true },
  });

  if (!snapshot) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  const { percentComplete } = result.data;
  const accrual = Math.round(Number(snapshot.orderTotal) * percentComplete) / 100;

  const updated = await prisma.monthEndSnapshot.update({
    where: { id },
    data: { percentComplete, accrual },
  });

  return NextResponse.json(updated);
}
