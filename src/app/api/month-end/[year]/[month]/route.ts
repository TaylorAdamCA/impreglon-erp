import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import type { OrderStatus } from "@/generated/prisma/client";

const WIP_STATUSES: OrderStatus[] = ["IN_PROGRESS", "REWORK"];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "monthend"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { year, month } = await params;
  const reportYear = parseInt(year, 10);
  const reportMonth = parseInt(month, 10);

  const snapshots = await prisma.monthEndSnapshot.findMany({
    where: { reportYear, reportMonth },
    orderBy: { orderNo: "asc" },
  });

  return NextResponse.json({ snapshots, year: reportYear, month: reportMonth });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "monthend"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { year, month } = await params;
  const reportYear = parseInt(year, 10);
  const reportMonth = parseInt(month, 10);

  // Check if snapshots already exist
  const existing = await prisma.monthEndSnapshot.count({
    where: { reportYear, reportMonth },
  });

  if (existing > 0) {
    return NextResponse.json(
      { error: "Snapshots already exist for this period. Delete them first to re-seed." },
      { status: 400 }
    );
  }

  // Gather in-progress orders
  const orders = await prisma.order.findMany({
    where: { status: { in: WIP_STATUSES } },
    include: { customer: { select: { company: true } } },
  });

  const data = orders.map((order) => ({
    orderId: order.id,
    orderNo: order.orderNo,
    customerId: order.customerId,
    companyName: order.customer.company,
    orderTotal: Number(order.orderTotal),
    percentComplete: 0,
    accrual: 0,
    reportMonth,
    reportYear,
  }));

  const result = await prisma.monthEndSnapshot.createMany({ data });

  return NextResponse.json({ count: result.count }, { status: 201 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "monthend"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { year, month } = await params;
  const reportYear = parseInt(year, 10);
  const reportMonth = parseInt(month, 10);

  const result = await prisma.monthEndSnapshot.deleteMany({
    where: { reportMonth, reportYear },
  });

  return NextResponse.json({ deleted: result.count });
}
