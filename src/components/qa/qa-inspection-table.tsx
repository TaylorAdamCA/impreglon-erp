"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InspectionDetail {
  id: string;
  lineNumber: number;
  description: string;
  quantity: number;
  passedQty: number;
  reworkQty: number;
  coating: string | null;
}

interface QaInspectionTableProps {
  orderId: string;
  details: InspectionDetail[];
  disabled: boolean;
}

export function QaInspectionTable({
  orderId,
  details,
  disabled,
}: QaInspectionTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [passValues, setPassValues] = useState<Record<string, string>>({});
  const [reworkValues, setReworkValues] = useState<Record<string, string>>({});

  const passedCount = details.filter((d) => d.passedQty >= d.quantity).length;
  const totalCount = details.length;

  async function handleInspect(detailId: string) {
    const currentPass = parseInt(passValues[detailId] || "0", 10);
    const reworkQty = parseInt(reworkValues[detailId] || "0", 10);

    if (currentPass <= 0 && reworkQty <= 0) {
      toast.error("Enter a pass or rework quantity");
      return;
    }

    const detail = details.find((d) => d.id === detailId);
    if (detail) {
      const remaining = detail.quantity - detail.passedQty - detail.reworkQty;
      if (currentPass + reworkQty > remaining) {
        toast.error(
          `Total (${currentPass + reworkQty}) exceeds remaining quantity (${remaining})`
        );
        return;
      }
    }

    setLoadingId(detailId);
    try {
      const body: Record<string, unknown> = { detailId, currentPass };
      if (reworkQty > 0) {
        body.reworkQty = reworkQty;
      }

      const res = await fetch(`/api/qa/orders/${orderId}/inspect`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to submit inspection");
        return;
      }

      toast.success("Inspection submitted");
      setPassValues((prev) => ({ ...prev, [detailId]: "" }));
      setReworkValues((prev) => ({ ...prev, [detailId]: "" }));
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingId(null);
    }
  }

  function getRowClass(detail: InspectionDetail): string {
    if (detail.quantity === 0) return "bg-muted/50";
    if (detail.passedQty >= detail.quantity)
      return "bg-green-50 dark:bg-green-950/30";
    if (detail.reworkQty > 0) return "bg-red-50 dark:bg-red-950/30";
    return "";
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            <CardTitle>Inspection</CardTitle>
          </div>
          <span className="text-sm text-muted-foreground">
            {passedCount} of {totalCount} item{totalCount !== 1 ? "s" : ""}{" "}
            passed inspection
          </span>
        </div>
        {totalCount > 0 && (
          <div className="mt-2 h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{
                width: `${totalCount > 0 ? (passedCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {details.length === 0 ? (
          <p className="text-sm text-muted-foreground">No line items.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Line</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-16">Qty</TableHead>
                  <TableHead className="w-20">Passed</TableHead>
                  <TableHead className="w-20">Rework</TableHead>
                  <TableHead className="w-24">Remaining</TableHead>
                  <TableHead className="w-64">Inspect</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.map((detail) => {
                  const remaining =
                    detail.quantity - detail.passedQty - detail.reworkQty;

                  return (
                    <TableRow key={detail.id} className={getRowClass(detail)}>
                      <TableCell className="font-mono">
                        {detail.lineNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          {detail.description}
                          {detail.coating && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({detail.coating})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{detail.quantity}</TableCell>
                      <TableCell className="font-medium text-green-700 dark:text-green-400">
                        {detail.passedQty}
                      </TableCell>
                      <TableCell className="font-medium text-red-700 dark:text-red-400">
                        {detail.reworkQty > 0 ? detail.reworkQty : "\u2014"}
                      </TableCell>
                      <TableCell>{remaining}</TableCell>
                      <TableCell>
                        {disabled || remaining <= 0 ? (
                          <span className="text-xs text-muted-foreground">
                            {remaining <= 0 ? "Complete" : "Disabled"}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              max={remaining}
                              placeholder="Pass"
                              className="h-7 w-16 text-xs"
                              value={passValues[detail.id] ?? ""}
                              onChange={(e) =>
                                setPassValues((prev) => ({
                                  ...prev,
                                  [detail.id]: e.target.value,
                                }))
                              }
                              disabled={loadingId !== null}
                            />
                            <Input
                              type="number"
                              min={0}
                              max={remaining}
                              placeholder="Rew"
                              className="h-7 w-16 text-xs"
                              value={reworkValues[detail.id] ?? ""}
                              onChange={(e) =>
                                setReworkValues((prev) => ({
                                  ...prev,
                                  [detail.id]: e.target.value,
                                }))
                              }
                              disabled={loadingId !== null}
                            />
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleInspect(detail.id)}
                              disabled={loadingId !== null}
                            >
                              {loadingId === detail.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Submit"
                              )}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
