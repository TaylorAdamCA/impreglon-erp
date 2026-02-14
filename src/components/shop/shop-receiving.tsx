"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReceivingDetail {
  id: string;
  lineNumber: number;
  description: string;
  coating: string | null;
  quantity: number;
  unitPrice: string;
  receivedAt: string | null;
}

interface ShopReceivingProps {
  orderId: string;
  details: ReceivingDetail[];
  isShipped: boolean;
}

export function ShopReceiving({
  orderId,
  details,
  isShipped,
}: ShopReceivingProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const receivedCount = details.filter((d) => d.receivedAt !== null).length;
  const totalCount = details.length;

  async function handleToggleReceived(detailId: string, received: boolean) {
    setLoadingId(detailId);
    try {
      const res = await fetch(`/api/shop/orders/${orderId}/receive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detailId, received }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to update receiving status");
        return;
      }

      toast.success(received ? "Item marked as received" : "Item unmarked");
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <CardTitle>Receiving</CardTitle>
          </div>
          <span className="text-sm text-muted-foreground">
            {receivedCount} of {totalCount} item{totalCount !== 1 ? "s" : ""}{" "}
            received
          </span>
        </div>
        {totalCount > 0 && (
          <div className="mt-2 h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{
                width: `${totalCount > 0 ? (receivedCount / totalCount) * 100 : 0}%`,
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
                  <TableHead className="w-20">Qty</TableHead>
                  <TableHead className="w-32">Coating</TableHead>
                  <TableHead className="w-24">Received</TableHead>
                  <TableHead className="w-40">Received At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.map((detail) => (
                  <TableRow key={detail.id}>
                    <TableCell className="font-mono">
                      {detail.lineNumber}
                    </TableCell>
                    <TableCell>{detail.description}</TableCell>
                    <TableCell>{detail.quantity}</TableCell>
                    <TableCell>{detail.coating ?? "\u2014"}</TableCell>
                    <TableCell>
                      <Checkbox
                        checked={detail.receivedAt !== null}
                        onCheckedChange={(checked) =>
                          handleToggleReceived(detail.id, checked === true)
                        }
                        disabled={isShipped || loadingId === detail.id}
                        aria-label={`Mark line ${detail.lineNumber} as received`}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {detail.receivedAt
                        ? new Date(detail.receivedAt).toLocaleString("en-CA")
                        : "\u2014"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
