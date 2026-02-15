import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { PeriodList } from "@/components/month-end/period-list";

export default async function MonthEndPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const canAccess = await hasPermission(session.user.id, "monthend");
  if (!canAccess) redirect("/dashboard");

  const snapshots = await prisma.monthEndSnapshot.findMany({
    orderBy: [{ reportYear: "desc" }, { reportMonth: "desc" }],
  });

  // Group by period
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

  return <PeriodList periods={periods} />;
}
