"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface QaOrderHeaderProps {
  order: {
    id: string;
    orderNo: number;
    poNumber: string | null;
    status: string;
    customer: { id: string; company: string };
  };
  allPassed: boolean;
  hasUnresolvedRework: boolean;
  allReworkResolved: boolean;
}

function statusBadge(status: string) {
  switch (status) {
    case "IN_PROGRESS":
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-600">
          In Progress
        </Badge>
      );
    case "REWORK":
      return <Badge variant="destructive">Rework</Badge>;
    case "READY_TO_SHIP":
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          Ready to Ship
        </Badge>
      );
    case "SHIPPED":
      return <Badge variant="secondary">Shipped</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function QaOrderHeader({
  order,
  allPassed,
  hasUnresolvedRework,
  allReworkResolved,
}: QaOrderHeaderProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  async function handlePassQA() {
    if (!window.confirm("Pass this order through QA?")) return;

    setLoadingAction("pass");
    try {
      const res = await fetch(`/api/qa/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pass" }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to pass QA");
        return;
      }

      toast.success("Order passed QA — ready to ship");
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleSendToRework() {
    if (!window.confirm("Send this order to rework?")) return;

    setLoadingAction("rework");
    try {
      const res = await fetch(`/api/qa/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rework" }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to send to rework");
        return;
      }

      toast.success("Order sent to rework");
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleReturnToQA() {
    if (!window.confirm("Return this order to QA?")) return;

    setLoadingAction("return");
    try {
      const res = await fetch(`/api/qa/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "return" }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to return to QA");
        return;
      }

      toast.success("Order returned to QA");
      router.refresh();
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
          <Link href="/qa">
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
            {order.poNumber && (
              <>
                <span>|</span>
                <span>PO# {order.poNumber}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {order.status === "IN_PROGRESS" && allPassed && (
            <Button
              onClick={handlePassQA}
              disabled={loadingAction !== null}
            >
              {loadingAction === "pass" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Pass QA
            </Button>
          )}
          {order.status === "IN_PROGRESS" && hasUnresolvedRework && (
            <Button
              variant="destructive"
              onClick={handleSendToRework}
              disabled={loadingAction !== null}
            >
              {loadingAction === "rework" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="mr-2 h-4 w-4" />
              )}
              Send to Rework
            </Button>
          )}
          {order.status === "REWORK" && allReworkResolved && (
            <Button
              onClick={handleReturnToQA}
              disabled={loadingAction !== null}
            >
              {loadingAction === "return" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Return to QA
            </Button>
          )}
        </div>
      </div>

      <Separator />
    </div>
  );
}
