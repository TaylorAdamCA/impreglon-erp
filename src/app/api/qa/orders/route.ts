import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "QA_MANAGE");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};

  if (status === "rework") {
    where.status = "REWORK";
  } else if (status === "in_progress") {
    where.status = "IN_PROGRESS";
  } else {
    // Default: show IN_PROGRESS and REWORK orders
    where.status = { in: ["IN_PROGRESS", "REWORK"] };
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      customer: { select: { id: true, company: true } },
      details: {
        select: { quantity: true, passedQty: true, reworkQty: true },
      },
      reworkItems: {
        select: { id: true, resolved: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}
