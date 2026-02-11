import {
  ClipboardList,
  FileText,
  ShieldCheck,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  description: string;
}

function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const [openOrders, pendingQuotes, itemsInQc, overdueInvoices, recentLogs] =
    await Promise.all([
      prisma.order.count({
        where: { status: { in: ["PENDING", "IN_PROGRESS", "REWORK"] } },
      }),
      prisma.quote.count({
        where: { status: { in: ["DRAFT", "PENDING_APPROVAL"] } },
      }),
      prisma.order.count({
        where: { status: "REWORK" },
      }),
      prisma.order.count({
        where: {
          status: { in: ["DRAFT_INVOICE", "INVOICE_APPROVED", "INVOICE_MODIFIED"] },
          dueDate: { lt: new Date() },
        },
      }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { timestamp: "desc" },
        include: { user: { select: { username: true } } },
      }),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Impreglon Coating Management System
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Open Orders"
          value={openOrders}
          icon={ClipboardList}
          description="Pending, in progress, or rework"
        />
        <StatCard
          title="Pending Quotes"
          value={pendingQuotes}
          icon={FileText}
          description="Draft or awaiting approval"
        />
        <StatCard
          title="Items in QC"
          value={itemsInQc}
          icon={ShieldCheck}
          description="Flagged for rework"
        />
        <StatCard
          title="Overdue Invoices"
          value={overdueInvoices}
          icon={Receipt}
          description="Past due date, not finalized"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <span className="font-medium">{log.user.username}</span>{" "}
                    <span className="text-muted-foreground">
                      {log.action} {log.entityType}
                      {log.entityId ? ` #${log.entityId}` : ""}
                    </span>
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {log.timestamp.toLocaleDateString()}
                  </time>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
