import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { PeriodDetail } from "@/components/month-end/period-detail";

interface PeriodDetailPageProps {
  params: Promise<{ year: string; month: string }>;
}

export default async function PeriodDetailPage({ params }: PeriodDetailPageProps) {
  const { year, month } = await params;
  const reportYear = parseInt(year, 10);
  const reportMonth = parseInt(month, 10);

  const session = await auth();
  if (!session?.user) redirect("/login");

  const canAccess = await hasPermission(session.user.id, "monthend");
  if (!canAccess) redirect("/dashboard");

  const snapshots = await prisma.monthEndSnapshot.findMany({
    where: { reportYear, reportMonth },
    orderBy: { orderNo: "asc" },
  });

  const serialized = snapshots.map((s) => ({
    id: s.id,
    orderId: s.orderId,
    orderNo: s.orderNo,
    customerId: s.customerId,
    companyName: s.companyName,
    orderTotal: s.orderTotal.toString(),
    percentComplete: s.percentComplete,
    accrual: s.accrual.toString(),
  }));

  return (
    <PeriodDetail
      snapshots={serialized}
      year={reportYear}
      month={reportMonth}
    />
  );
}
