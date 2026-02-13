"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface QuoteHeaderProps {
  quote: {
    id: string;
    quoteNo: number;
    quoteDate: string;
    status: string;
    quoteTotal: number | string;
    customer: { company: string; id: string };
    createdBy: { username: string };
  };
  canApprove: boolean;
}

export function QuoteHeader({ quote, canApprove }: QuoteHeaderProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  async function handleStatusAction(action: string, confirmMessage: string) {
    if (!window.confirm(confirmMessage)) return;

    setLoadingAction(action);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/status`, {
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

  async function handleConvertToOrder() {
    if (!window.confirm("Convert this quote to an order?")) return;

    setLoadingAction("convert");
    try {
      const res = await fetch(`/api/quotes/${quote.id}/convert`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to convert quote");
        return;
      }

      const newOrder = await res.json();
      toast.success("Quote converted to order successfully");
      router.push(`/orders/${newOrder.id}`);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this quote? This cannot be undone.")) return;

    setLoadingAction("delete");
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to delete quote");
        return;
      }

      router.push("/quotes");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="icon" asChild>
        <Link href="/quotes">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Quote #{quote.quoteNo}</h1>
          {quote.status === "DRAFT" && (
            <Badge variant="secondary">Draft</Badge>
          )}
          {quote.status === "PENDING_APPROVAL" && (
            <Badge
              variant="outline"
              className="border-yellow-500 text-yellow-600"
            >
              Pending Approval
            </Badge>
          )}
          {quote.status === "APPROVED" && (
            <Badge variant="default">Approved</Badge>
          )}
          {quote.status === "SENT" && (
            <Badge variant="outline">Sent</Badge>
          )}
          {quote.status === "CONVERTED" && (
            <Badge variant="default">Converted</Badge>
          )}
          {quote.status === "EXPIRED" && (
            <Badge variant="secondary">Expired</Badge>
          )}
        </div>
        <p className="mt-1 text-muted-foreground">
          <Link
            href={`/customers/${quote.customer.id}`}
            className="text-primary hover:underline"
          >
            {quote.customer.company}
          </Link>
          {" | "}
          {new Date(quote.quoteDate).toLocaleDateString("en-CA")}
          {" | Created by "}
          {quote.createdBy.username}
        </p>
        <p className="mt-1 text-xl font-semibold">
          ${Number(quote.quoteTotal).toFixed(2)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {quote.status === "DRAFT" && (
          <>
            <Button
              onClick={() =>
                handleStatusAction("submit", "Submit this quote for approval?")
              }
              disabled={loadingAction !== null}
            >
              {loadingAction === "submit" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Submit for Approval
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
              Delete Quote
            </Button>
          </>
        )}
        {quote.status === "PENDING_APPROVAL" && canApprove && (
          <>
            <Button
              onClick={() =>
                handleStatusAction("approve", "Approve this quote?")
              }
              disabled={loadingAction !== null}
            >
              {loadingAction === "approve" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Approve
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                handleStatusAction(
                  "reject",
                  "Reject this quote and return to draft?"
                )
              }
              disabled={loadingAction !== null}
            >
              {loadingAction === "reject" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Reject
            </Button>
          </>
        )}
        {quote.status === "APPROVED" && (
          <Button
            onClick={handleConvertToOrder}
            disabled={loadingAction !== null}
          >
            {loadingAction === "convert" && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Convert to Order
          </Button>
        )}
      </div>
    </div>
  );
}
