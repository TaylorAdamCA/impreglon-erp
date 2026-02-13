"use client";

import { Badge } from "@/components/ui/badge";

interface OrderStatusHistoryProps {
  history: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    changedAt: string;
    changedBy: { username: string };
    notes: string | null;
  }>;
}

function statusBadge(status: string | null) {
  if (!status) {
    return <span className="text-muted-foreground">&mdash;</span>;
  }

  switch (status) {
    case "PENDING":
      return <Badge variant="secondary">Pending</Badge>;
    case "IN_PROGRESS":
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
          In Progress
        </Badge>
      );
    case "READY_TO_SHIP":
      return (
        <Badge variant="default" className="bg-green-600">
          Ready to Ship
        </Badge>
      );
    case "SHIPPED":
      return <Badge variant="default">Shipped</Badge>;
    case "INVOICED":
      return <Badge variant="outline">Invoiced</Badge>;
    case "CANCELLED":
      return <Badge variant="secondary">Cancelled</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function OrderStatusHistory({ history }: OrderStatusHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Status History</h2>
        <p className="text-muted-foreground">No status changes yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Status History</h2>
      <div className="space-y-3">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-4 rounded-md border p-3"
          >
            <div className="min-w-[140px] text-sm text-muted-foreground">
              {new Date(entry.changedAt).toLocaleString("en-CA", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </div>
            <div className="flex items-center gap-2">
              {statusBadge(entry.fromStatus)}
              <span className="text-muted-foreground">&rarr;</span>
              {statusBadge(entry.toStatus)}
            </div>
            <div className="text-sm text-muted-foreground">
              by {entry.changedBy.username}
            </div>
            {entry.notes && (
              <div className="text-sm italic text-muted-foreground">
                {entry.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
