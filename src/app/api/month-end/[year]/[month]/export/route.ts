import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

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

  const header = "Order #,Customer #,Company,Order Total,% Complete,Accrual,Month,Year";
  const rows = snapshots.map((s) =>
    [
      s.orderNo,
      s.customerId,
      `"${s.companyName}"`,
      Number(s.orderTotal),
      s.percentComplete,
      Number(s.accrual),
      s.reportMonth,
      s.reportYear,
    ].join(",")
  );

  const csv = [header, ...rows].join("\n");
  const paddedMonth = String(reportMonth).padStart(2, "0");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="month-end-${reportYear}-${paddedMonth}.csv"`,
    },
  });
}
