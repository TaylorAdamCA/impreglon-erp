"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatLibraryType(type: string | null): string {
  if (!type) return "Custom";
  return type
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

interface OrderLineItemsProps {
  orderId: string;
  details: Array<{
    id: string;
    lineNumber: number;
    description: string;
    coating: string | null;
    libraryType: string | null;
    quantity: number;
    unitPrice: number | string;
    lineTotal: number | string;
  }>;
  isPending: boolean;
  onAddItem: () => void;
}

interface EditableValues {
  [detailId: string]: {
    quantity: string;
    unitPrice: string;
  };
}

export function OrderLineItems({
  orderId,
  details,
  isPending,
  onAddItem,
}: OrderLineItemsProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Track local editable values keyed by detail id
  const [editValues, setEditValues] = useState<EditableValues>(() => {
    const initial: EditableValues = {};
    for (const d of details) {
      initial[d.id] = {
        quantity: String(d.quantity),
        unitPrice: String(Number(d.unitPrice)),
      };
    }
    return initial;
  });

  function updateLocalValue(
    detailId: string,
    field: "quantity" | "unitPrice",
    value: string
  ) {
    setEditValues((prev) => ({
      ...prev,
      [detailId]: {
        ...prev[detailId],
        [field]: value,
      },
    }));
  }

  async function handleBlur(detail: OrderLineItemsProps["details"][0]) {
    const local = editValues[detail.id];
    if (!local) return;

    const newQty = parseInt(local.quantity, 10);
    const newPrice = parseFloat(local.unitPrice);

    // Check if values actually changed
    if (
      newQty === detail.quantity &&
      newPrice === Number(detail.unitPrice)
    ) {
      return;
    }

    // Validate
    if (isNaN(newQty) || newQty < 1) {
      toast.error("Quantity must be at least 1");
      setEditValues((prev) => ({
        ...prev,
        [detail.id]: {
          ...prev[detail.id],
          quantity: String(detail.quantity),
        },
      }));
      return;
    }

    if (isNaN(newPrice) || newPrice < 0) {
      toast.error("Price must be 0 or greater");
      setEditValues((prev) => ({
        ...prev,
        [detail.id]: {
          ...prev[detail.id],
          unitPrice: String(Number(detail.unitPrice)),
        },
      }));
      return;
    }

    setUpdatingId(detail.id);
    try {
      const res = await fetch(
        `/api/orders/${orderId}/details/${detail.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: detail.description,
            quantity: newQty,
            unitPrice: newPrice,
            coating: detail.coating,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to update line item");
        // Reset values on failure
        setEditValues((prev) => ({
          ...prev,
          [detail.id]: {
            quantity: String(detail.quantity),
            unitPrice: String(Number(detail.unitPrice)),
          },
        }));
        return;
      }

      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
      setEditValues((prev) => ({
        ...prev,
        [detail.id]: {
          quantity: String(detail.quantity),
          unitPrice: String(Number(detail.unitPrice)),
        },
      }));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(detailId: string) {
    if (!window.confirm("Remove this line item?")) return;

    setDeletingId(detailId);
    try {
      const res = await fetch(
        `/api/orders/${orderId}/details/${detailId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to delete line item");
        return;
      }

      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const total = details.reduce(
    (sum, d) => sum + Number(d.lineTotal),
    0
  );

  const colCount = isPending ? 8 : 7;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Line Items</h2>
        {isPending && (
          <Button size="sm" onClick={onAddItem}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-32">Coating</TableHead>
              <TableHead className="w-28">Type</TableHead>
              <TableHead className="w-24">Qty</TableHead>
              <TableHead className="w-32">Unit Price</TableHead>
              <TableHead className="w-28 text-right">Line Total</TableHead>
              {isPending && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {details.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="h-24 text-center"
                >
                  <p className="text-muted-foreground">
                    No line items yet.
                    {isPending && " Click \"Add Item\" to get started."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              details.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    {d.lineNumber}
                  </TableCell>
                  <TableCell>{d.description}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.coating || "\u2014"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {formatLibraryType(d.libraryType)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {isPending ? (
                      <Input
                        type="number"
                        min={1}
                        value={editValues[d.id]?.quantity ?? String(d.quantity)}
                        onChange={(e) =>
                          updateLocalValue(d.id, "quantity", e.target.value)
                        }
                        onBlur={() => handleBlur(d)}
                        className="h-8 w-20"
                        disabled={updatingId === d.id}
                      />
                    ) : (
                      d.quantity
                    )}
                  </TableCell>
                  <TableCell>
                    {isPending ? (
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={
                          editValues[d.id]?.unitPrice ??
                          String(Number(d.unitPrice))
                        }
                        onChange={(e) =>
                          updateLocalValue(d.id, "unitPrice", e.target.value)
                        }
                        onBlur={() => handleBlur(d)}
                        className="h-8 w-28"
                        disabled={updatingId === d.id}
                      />
                    ) : (
                      `$${Number(d.unitPrice).toFixed(2)}`
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${Number(d.lineTotal).toFixed(2)}
                  </TableCell>
                  {isPending && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(d.id)}
                        disabled={deletingId === d.id}
                      >
                        {deletingId === d.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
            {details.length > 0 && (
              <TableRow>
                <TableCell
                  colSpan={isPending ? 6 : 6}
                  className="text-right font-semibold"
                >
                  Total
                </TableCell>
                <TableCell className="text-right font-semibold">
                  ${total.toFixed(2)}
                </TableCell>
                {isPending && <TableCell />}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
