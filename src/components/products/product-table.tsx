"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Ban, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type LibraryType, HAS_DRT } from "@/lib/validations/product";
import { ProductDialog } from "./product-dialog";

interface CoatingLabel {
  slotNumber: number;
  coatingName: string;
  areaSpec: string;
}

interface ProductItem {
  id: string;
  libraryNo: number;
  catalogSource: string | null;
  description: string;
  size: string | null;
  type: string | null;
  coatingPrice1: string | null;
  coatingPrice2: string | null;
  coatingPrice3: string | null;
  coatingPrice4: string | null;
  coatingPrice5: string | null;
  coatingPrice6: string | null;
  coatingPrice7: string | null;
  coatingPrice8: string | null;
  drtCostLower: string | null;
  drtCostHigher: string | null;
  drtSellingLower: string | null;
  drtSellingHigher: string | null;
  isActive: boolean;
}

interface ProductTableProps {
  libraryType: LibraryType;
  items: ProductItem[];
  labels: CoatingLabel[];
}

type PendingChanges = Record<string, Record<string, string>>;

function formatPrice(value: string | null): string {
  if (value == null || value === "") return "";
  const num = parseFloat(value);
  if (isNaN(num)) return "";
  return num.toFixed(2);
}

export function ProductTable({
  libraryType,
  items,
  labels,
}: ProductTableProps) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingChanges>({});
  const [editingCell, setEditingCell] = useState<{
    itemId: string;
    field: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductItem | null>(null);

  const hasDrt = HAS_DRT[libraryType];
  const hasPending = Object.keys(pending).length > 0;

  // Build visible coating columns from labels
  const coatingCols = labels.map((l) => ({
    field: `coatingPrice${l.slotNumber}` as keyof ProductItem,
    label: `${l.coatingName} / ${l.areaSpec}`,
    editable: !(libraryType === "FITTING" && l.slotNumber === 3),
  }));

  // DRT columns for valve types
  const drtCols = hasDrt
    ? [
        { field: "drtCostLower" as keyof ProductItem, label: "DRT Cost (Lower)", editable: true },
        { field: "drtCostHigher" as keyof ProductItem, label: "DRT Cost (Higher)", editable: true },
        { field: "drtSellingLower" as keyof ProductItem, label: "DRT Sell (Lower)", editable: false },
        { field: "drtSellingHigher" as keyof ProductItem, label: "DRT Sell (Higher)", editable: false },
      ]
    : [];

  const allPriceCols = [...coatingCols, ...drtCols];

  const getCellValue = useCallback(
    (item: ProductItem, field: string): string => {
      if (pending[item.id]?.[field] !== undefined) {
        return pending[item.id][field];
      }
      return formatPrice(item[field as keyof ProductItem] as string | null);
    },
    [pending]
  );

  function handleCellClick(itemId: string, field: string, editable: boolean) {
    if (!editable) return;
    setEditingCell({ itemId, field });
  }

  function handleCellChange(itemId: string, field: string, value: string) {
    setPending((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? {}), [field]: value },
    }));
  }

  function handleCellBlur() {
    setEditingCell(null);
  }

  function handleCellKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "Tab") {
      setEditingCell(null);
    }
    if (e.key === "Escape") {
      if (editingCell) {
        // Revert this cell
        setPending((prev) => {
          const copy = { ...prev };
          if (copy[editingCell.itemId]) {
            delete copy[editingCell.itemId][editingCell.field];
            if (Object.keys(copy[editingCell.itemId]).length === 0) {
              delete copy[editingCell.itemId];
            }
          }
          return copy;
        });
      }
      setEditingCell(null);
    }
  }

  async function saveAllChanges() {
    setSaving(true);
    let savedCount = 0;

    for (const [itemId, prices] of Object.entries(pending)) {
      const res = await fetch(`/api/products/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prices }),
      });

      if (res.ok) {
        savedCount++;
      }
    }

    setSaving(false);
    setPending({});
    toast.success(`Saved changes to ${savedCount} item${savedCount !== 1 ? "s" : ""}`);
    router.refresh();
  }

  async function toggleActive(item: ProductItem) {
    const action = item.isActive ? "deactivate" : "reactivate";
    if (!confirm(`Are you sure you want to ${action} this item?`)) return;

    const res = await fetch(`/api/products/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });

    if (res.ok) {
      toast.success(`Item ${action}d`);
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      {hasPending && (
        <div className="flex items-center justify-between rounded-md border border-yellow-500/50 bg-yellow-500/10 px-4 py-2">
          <p className="text-sm font-medium">
            Unsaved price changes ({Object.keys(pending).length} item
            {Object.keys(pending).length !== 1 ? "s" : ""})
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPending({})}
            >
              Discard
            </Button>
            <Button size="sm" onClick={saveAllChanges} disabled={saving}>
              <Save className="mr-2 h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save All Changes"}
            </Button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Lib #</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Size</TableHead>
            {allPriceCols.map((col) => (
              <TableHead key={col.field} className="text-right text-xs">
                {col.label}
              </TableHead>
            ))}
            <TableHead className="w-16">Status</TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5 + allPriceCols.length}
                className="h-24 text-center text-muted-foreground"
              >
                No items in this library. Add one to get started.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs">
                  {item.libraryNo}
                </TableCell>
                <TableCell className="font-medium max-w-[200px] truncate">
                  {item.description}
                </TableCell>
                <TableCell className="text-sm">{item.size}</TableCell>
                {allPriceCols.map((col) => {
                  const isEditing =
                    editingCell?.itemId === item.id &&
                    editingCell?.field === col.field;
                  const value = getCellValue(item, col.field);
                  const hasChange = pending[item.id]?.[col.field] !== undefined;

                  return (
                    <TableCell
                      key={col.field}
                      className={`text-right font-mono text-sm p-0 ${
                        col.editable ? "cursor-pointer" : ""
                      } ${hasChange ? "bg-yellow-500/10" : ""}`}
                      onClick={() =>
                        handleCellClick(item.id, col.field, col.editable)
                      }
                    >
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          autoFocus
                          value={value}
                          onChange={(e) =>
                            handleCellChange(
                              item.id,
                              col.field,
                              e.target.value
                            )
                          }
                          onBlur={handleCellBlur}
                          onKeyDown={handleCellKeyDown}
                          className="w-full h-full px-2 py-1.5 text-right font-mono text-sm bg-background border-2 border-primary rounded-none outline-none"
                        />
                      ) : (
                        <span className="block px-2 py-1.5">
                          {value ? `$${value}` : "—"}
                        </span>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell>
                  <Badge
                    variant={item.isActive ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {item.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditingItem(item)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => toggleActive(item)}
                    >
                      {item.isActive ? (
                        <Ban className="h-3 w-3 text-destructive" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {editingItem && (
        <ProductDialog
          libraryType={libraryType}
          item={editingItem}
          open={!!editingItem}
          onOpenChange={(open) => {
            if (!open) setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}
