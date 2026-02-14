"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Truck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ShopOrderHeaderProps {
  order: {
    id: string;
    orderNo: number;
    orderDate: string;
    shipDate: string | null;
    dueDate: string | null;
    poNumber: string | null;
    status: string;
    processTemplate: string | null;
    customer: { id: string; company: string };
  };
  allStepsComplete: boolean;
}

interface ProcessTemplate {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

function statusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return <Badge variant="secondary">Pending</Badge>;
    case "IN_PROGRESS":
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-600">
          In Progress
        </Badge>
      );
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

export function ShopOrderHeader({
  order,
  allStepsComplete,
}: ShopOrderHeaderProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    async function fetchTemplates() {
      setLoadingTemplates(true);
      try {
        const res = await fetch("/api/admin/process-templates");
        if (res.ok) {
          const data = await res.json();
          setTemplates(data);
        }
      } catch {
        // Silently fail — templates dropdown will just be empty
      } finally {
        setLoadingTemplates(false);
      }
    }

    if (order.status === "IN_PROGRESS") {
      fetchTemplates();
    }
  }, [order.status]);

  async function handleAssignTemplate(templateId: string) {
    setLoadingAction("assign-template");
    try {
      const res = await fetch(`/api/shop/orders/${order.id}/assign-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to assign template");
        return;
      }

      toast.success("Process template assigned");
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleMarkReady() {
    if (!window.confirm("Mark this order as ready to ship?")) return;

    setLoadingAction("ready");
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ready" }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to mark ready");
        return;
      }

      toast.success("Order marked as ready to ship");
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleShip() {
    if (!window.confirm("Ship this order? This action cannot be undone."))
      return;

    setLoadingAction("ship");
    try {
      const res = await fetch(`/api/shop/orders/${order.id}/ship`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to ship order");
        return;
      }

      toast.success("Order shipped successfully");
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  }

  const currentTemplateName = order.processTemplate
    ? templates.find((t) => t.id === order.processTemplate)?.name ?? null
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/shop">
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
                  Shipped: {new Date(order.shipDate).toLocaleDateString("en-CA")}
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
          </div>
        </div>
        <div className="flex items-center gap-2">
          {order.status === "IN_PROGRESS" && allStepsComplete && (
            <Button
              onClick={handleMarkReady}
              disabled={loadingAction !== null}
            >
              {loadingAction === "ready" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Mark Ready to Ship
            </Button>
          )}
          {order.status === "READY_TO_SHIP" && (
            <Button
              onClick={handleShip}
              disabled={loadingAction !== null}
            >
              {loadingAction === "ship" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Truck className="mr-2 h-4 w-4" />
              )}
              Ship Order
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {order.status === "IN_PROGRESS" && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Process Template:</span>
          {loadingTemplates ? (
            <span className="text-sm text-muted-foreground">Loading...</span>
          ) : (
            <Select
              value={order.processTemplate ?? ""}
              onValueChange={handleAssignTemplate}
              disabled={loadingAction !== null}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {currentTemplateName && (
            <span className="text-sm text-muted-foreground">
              Currently: {currentTemplateName}
            </span>
          )}
        </div>
      )}

      {order.status === "SHIPPED" && order.shipDate && (
        <div className="text-sm text-muted-foreground">
          This order was shipped on{" "}
          {new Date(order.shipDate).toLocaleDateString("en-CA")}.
        </div>
      )}
    </div>
  );
}
