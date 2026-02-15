import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "monthend"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snapshots = await prisma.monthEndSnapshot.findMany({
    orderBy: [{ reportYear: "desc" }, { reportMonth: "desc" }],
  });

  // Group by year/month
  const periodMap = new Map<string, {
    year: number;
    month: number;
    orderCount: number;
    totalOrderValue: number;
    totalAccruals: number;
  }>();

  for (const s of snapshots) {
    const key = `${s.reportYear}-${s.reportMonth}`;
    const existing = periodMap.get(key);
    if (existing) {
      existing.orderCount++;
      existing.totalOrderValue += Number(s.orderTotal);
      existing.totalAccruals += Number(s.accrual);
    } else {
      periodMap.set(key, {
        year: s.reportYear,
        month: s.reportMonth,
        orderCount: 1,
        totalOrderValue: Number(s.orderTotal),
        totalAccruals: Number(s.accrual),
      });
    }
  }

  const periods = Array.from(periodMap.values());

  return NextResponse.json({ periods });
}
