"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReworkPlanDialog } from "@/components/qa/rework-plan-dialog";

interface ReworkMemo {
  id: string;
  planNo: number;
  productType: string;
  processTemplate: string | null;
  qaNotes: string | null;
  coatingFailure: string | null;
  methodFailure: string | null;
  operations: string | null;
  department: string | null;
}

interface ReworkItem {
  id: string;
  reworkQty: number;
  status: string;
  resolved: boolean;
  resolvedAt: string | null;
  orderDetailId: string;
  reworkMemo: ReworkMemo | null;
}

interface DetailRef {
  id: string;
  lineNumber: number;
  description: string;
}

interface ReworkSectionProps {
  orderId: string;
  reworkItems: ReworkItem[];
  details: DetailRef[];
  disabled: boolean;
}

function reworkStatusBadge(status: string) {
  switch (status) {
    case "FLAGGED":
      return <Badge variant="destructive">Flagged</Badge>;
    case "PLAN_CREATED":
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
          Plan Created
        </Badge>
      );
    case "IN_PROGRESS":
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-600">
          In Progress
        </Badge>
      );
    case "RESOLVED":
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          Resolved
        </Badge>
      );
    case "RETURNED_TO_QA":
      return (
        <Badge variant="outline" className="border-purple-500 text-purple-600">
          Returned to QA
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function ReworkSection({
  orderId,
  reworkItems,
  details,
  disabled,
}: ReworkSectionProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [selectedReworkId, setSelectedReworkId] = useState<string | null>(null);

  function getLineInfo(orderDetailId: string): string {
    const detail = details.find((d) => d.id === orderDetailId);
    if (!detail) return "Unknown";
    return `#${detail.lineNumber} — ${detail.description}`;
  }

  async function handleReworkAction(
    reworkId: string,
    action: "start" | "resolve"
  ) {
    const confirmMsg =
      action === "start"
        ? "Start rework on this item?"
        : "Mark this rework item as resolved?";
    if (!window.confirm(confirmMsg)) return;

    setLoadingId(reworkId);
    try {
      const res = await fetch(
        `/api/qa/orders/${orderId}/rework/${reworkId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? `Failed to ${action} rework`);
        return;
      }

      toast.success(
        action === "start" ? "Rework started" : "Rework item resolved"
      );
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingId(null);
    }
  }

  function openPlanDialog(reworkId: string) {
    setSelectedReworkId(reworkId);
    setPlanDialogOpen(true);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            <CardTitle>Rework Items</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {reworkItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rework items</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Line Item</TableHead>
                    <TableHead className="w-16">Qty</TableHead>
                    <TableHead className="w-24">Plan #</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-40">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reworkItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{getLineInfo(item.orderDetailId)}</TableCell>
                      <TableCell>{item.reworkQty}</TableCell>
                      <TableCell className="font-mono">
                        {item.reworkMemo ? item.reworkMemo.planNo : "\u2014"}
                      </TableCell>
                      <TableCell>{reworkStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        {item.status === "FLAGGED" && !disabled && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPlanDialog(item.id)}
                            disabled={loadingId !== null}
                          >
                            Create Plan
                          </Button>
                        )}
                        {item.status === "PLAN_CREATED" && !disabled && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleReworkAction(item.id, "start")
                            }
                            disabled={loadingId !== null}
                          >
                            {loadingId === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Start Rework"
                            )}
                          </Button>
                        )}
                        {item.status === "IN_PROGRESS" && !disabled && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleReworkAction(item.id, "resolve")
                            }
                            disabled={loadingId !== null}
                          >
                            {loadingId === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Resolve"
                            )}
                          </Button>
                        )}
                        {item.status === "RESOLVED" && item.resolvedAt && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.resolvedAt).toLocaleDateString(
                              "en-CA"
                            )}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedReworkId && (
        <ReworkPlanDialog
          orderId={orderId}
          reworkId={selectedReworkId}
          open={planDialogOpen}
          onOpenChange={(open) => {
            setPlanDialogOpen(open);
            if (!open) setSelectedReworkId(null);
          }}
        />
      )}
    </>
  );
}
