"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface OrderHeaderProps {
  order: {
    id: string;
    orderNo: number;
    orderDate: string;
    shipDate: string | null;
    dueDate: string | null;
    poNumber: string | null;
    status: string;
    orderTotal: number | string;
    gstAmount: number | string;
    gstRate: number | string | null;
    customer: { company: string; id: string };
    createdBy: { username: string };
    sourceQuoteId: string | null;
  };
}

function statusBadge(status: string) {
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

export function OrderHeader({ order }: OrderHeaderProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const subtotal = Number(order.orderTotal);
  const gstAmount = Number(order.gstAmount);
  const gstRate = order.gstRate !== null ? Number(order.gstRate) : null;
  const grandTotal = subtotal + gstAmount;

  async function handleStatusAction(action: string, confirmMessage: string) {
    if (!window.confirm(confirmMessage)) return;

    setLoadingAction(action);
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Action failed");
        return;
      }

      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this order? This cannot be undone.")) return;

    setLoadingAction("delete");
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to delete order");
        return;
      }

      router.push("/orders");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">
              Order #{order.orderNo}
            </h1>
            {statusBadge(order.status)}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-muted-foreground">
            <Link
              href={`/customers/${order.customer.id}`}
              className="text-primary hover:underline"
            >
              {order.customer.company}
            </Link>
            <span>|</span>
            <span>
              {new Date(order.orderDate).toLocaleDateString("en-CA")}
            </span>
            {order.poNumber && (
              <>
                <span>|</span>
                <span>PO# {order.poNumber}</span>
              </>
            )}
            {order.shipDate && (
              <>
                <span>|</span>
                <span>
                  Ship: {new Date(order.shipDate).toLocaleDateString("en-CA")}
                </span>
              </>
            )}
            {order.dueDate && (
              <>
                <span>|</span>
                <span>
                  Due: {new Date(order.dueDate).toLocaleDateString("en-CA")}
                </span>
              </>
            )}
            <span>|</span>
            <span>Created by {order.createdBy.username}</span>
            {order.sourceQuoteId && (
              <>
                <span>|</span>
                <Link
                  href={`/quotes/${order.sourceQuoteId}`}
                  className="text-primary hover:underline"
                >
                  Source Quote
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {order.status === "PENDING" && (
            <>
              <Button
                onClick={() =>
                  handleStatusAction(
                    "start",
                    "Start processing this order?"
                  )
                }
                disabled={loadingAction !== null}
              >
                {loadingAction === "start" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Start Processing
              </Button>
              <Button
                variant="outline"
                className="text-destructive"
                onClick={handleDelete}
                disabled={loadingAction !== null}
              >
                {loadingAction === "delete" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete Order
              </Button>
            </>
          )}
          {order.status === "IN_PROGRESS" && (
            <Button
              onClick={() =>
                handleStatusAction(
                  "complete",
                  "Mark this order as ready to ship?"
                )
              }
              disabled={loadingAction !== null}
            >
              {loadingAction === "complete" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Mark Ready to Ship
            </Button>
          )}
          {order.status === "READY_TO_SHIP" && (
            <span className="text-sm text-muted-foreground">
              Ready for shipping
            </span>
          )}
        </div>
      </div>

      <Separator />

      <div className="flex items-center gap-6">
        <div className="text-sm">
          <span className="text-muted-foreground">Subtotal:</span>{" "}
          <span className="font-medium">${subtotal.toFixed(2)}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">
            GST{gstRate !== null ? ` at ${gstRate}%` : ""}:
          </span>{" "}
          <span className="font-medium">${gstAmount.toFixed(2)}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Grand Total:</span>{" "}
          <span className="text-xl font-semibold">${grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
