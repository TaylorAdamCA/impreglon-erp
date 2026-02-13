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

interface QuoteLineItemsProps {
  quoteId: string;
  components: Array<{
    id: string;
    lineNumber: number;
    description: string;
    libraryType: string | null;
    quantity: number;
    unitPrice: number | string;
    lineTotal: number | string;
  }>;
  isDraft: boolean;
  onAddItem: () => void;
}

interface EditableValues {
  [componentId: string]: {
    quantity: string;
    unitPrice: string;
  };
}

export function QuoteLineItems({
  quoteId,
  components,
  isDraft,
  onAddItem,
}: QuoteLineItemsProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Track local editable values keyed by component id
  const [editValues, setEditValues] = useState<EditableValues>(() => {
    const initial: EditableValues = {};
    for (const c of components) {
      initial[c.id] = {
        quantity: String(c.quantity),
        unitPrice: String(Number(c.unitPrice)),
      };
    }
    return initial;
  });

  function updateLocalValue(
    componentId: string,
    field: "quantity" | "unitPrice",
    value: string
  ) {
    setEditValues((prev) => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        [field]: value,
      },
    }));
  }

  async function handleBlur(component: QuoteLineItemsProps["components"][0]) {
    const local = editValues[component.id];
    if (!local) return;

    const newQty = parseInt(local.quantity, 10);
    const newPrice = parseFloat(local.unitPrice);

    // Check if values actually changed
    if (
      newQty === component.quantity &&
      newPrice === Number(component.unitPrice)
    ) {
      return;
    }

    // Validate
    if (isNaN(newQty) || newQty < 1) {
      toast.error("Quantity must be at least 1");
      setEditValues((prev) => ({
        ...prev,
        [component.id]: {
          ...prev[component.id],
          quantity: String(component.quantity),
        },
      }));
      return;
    }

    if (isNaN(newPrice) || newPrice < 0) {
      toast.error("Price must be 0 or greater");
      setEditValues((prev) => ({
        ...prev,
        [component.id]: {
          ...prev[component.id],
          unitPrice: String(Number(component.unitPrice)),
        },
      }));
      return;
    }

    setUpdatingId(component.id);
    try {
      const res = await fetch(
        `/api/quotes/${quoteId}/components/${component.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: component.description,
            quantity: newQty,
            unitPrice: newPrice,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to update line item");
        // Reset values on failure
        setEditValues((prev) => ({
          ...prev,
          [component.id]: {
            quantity: String(component.quantity),
            unitPrice: String(Number(component.unitPrice)),
          },
        }));
        return;
      }

      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
      setEditValues((prev) => ({
        ...prev,
        [component.id]: {
          quantity: String(component.quantity),
          unitPrice: String(Number(component.unitPrice)),
        },
      }));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(componentId: string) {
    if (!window.confirm("Remove this line item?")) return;

    setDeletingId(componentId);
    try {
      const res = await fetch(
        `/api/quotes/${quoteId}/components/${componentId}`,
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

  const total = components.reduce(
    (sum, c) => sum + Number(c.lineTotal),
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Line Items</h2>
        {isDraft && (
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
              <TableHead className="w-28">Type</TableHead>
              <TableHead className="w-24">Qty</TableHead>
              <TableHead className="w-32">Unit Price</TableHead>
              <TableHead className="w-28 text-right">Line Total</TableHead>
              {isDraft && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {components.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isDraft ? 7 : 6}
                  className="h-24 text-center"
                >
                  <p className="text-muted-foreground">
                    No line items yet.
                    {isDraft && " Click \"Add Item\" to get started."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              components.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    {c.lineNumber}
                  </TableCell>
                  <TableCell>{c.description}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {formatLibraryType(c.libraryType)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {isDraft ? (
                      <Input
                        type="number"
                        min={1}
                        value={editValues[c.id]?.quantity ?? String(c.quantity)}
                        onChange={(e) =>
                          updateLocalValue(c.id, "quantity", e.target.value)
                        }
                        onBlur={() => handleBlur(c)}
                        className="h-8 w-20"
                        disabled={updatingId === c.id}
                      />
                    ) : (
                      c.quantity
                    )}
                  </TableCell>
                  <TableCell>
                    {isDraft ? (
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={
                          editValues[c.id]?.unitPrice ??
                          String(Number(c.unitPrice))
                        }
                        onChange={(e) =>
                          updateLocalValue(c.id, "unitPrice", e.target.value)
                        }
                        onBlur={() => handleBlur(c)}
                        className="h-8 w-28"
                        disabled={updatingId === c.id}
                      />
                    ) : (
                      `$${Number(c.unitPrice).toFixed(2)}`
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${Number(c.lineTotal).toFixed(2)}
                  </TableCell>
                  {isDraft && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                      >
                        {deletingId === c.id ? (
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
            {components.length > 0 && (
              <TableRow>
                <TableCell
                  colSpan={isDraft ? 5 : 5}
                  className="text-right font-semibold"
                >
                  Total
                </TableCell>
                <TableCell className="text-right font-semibold">
                  ${total.toFixed(2)}
                </TableCell>
                {isDraft && <TableCell />}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
