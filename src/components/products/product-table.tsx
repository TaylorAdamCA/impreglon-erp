"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Ban, RotateCcw } from "lucide-react";
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
import { ProductDialog } from "./product-dialog";
import {
  type LibraryType,
  PRICING_FIELDS,
  PRICE_LABELS,
} from "@/lib/validations/product";

interface ProductItem {
  id: string;
  libraryNo: number;
  description: string;
  size: string | null;
  type: string | null;
  price1: string | number | null;
  price2: string | number | null;
  price3: string | number | null;
  price7: string | number | null;
  price8: string | number | null;
  isActive: boolean;
}

interface ProductTableProps {
  libraryType: LibraryType;
  items: ProductItem[];
}

function formatPrice(value: string | number | null): string {
  if (value == null) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return `$${num.toFixed(2)}`;
}

export function ProductTable({ libraryType, items }: ProductTableProps) {
  const router = useRouter();
  const [editItem, setEditItem] = useState<ProductItem | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const pricingFields = PRICING_FIELDS[libraryType];

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
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Lib #</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Type</TableHead>
            {pricingFields.map((f) => (
              <TableHead key={f} className="text-right">
                {PRICE_LABELS[f]}
              </TableHead>
            ))}
            <TableHead className="w-20">Status</TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5 + pricingFields.length + 1}
                className="h-24 text-center text-muted-foreground"
              >
                No items in this library.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono">{item.libraryNo}</TableCell>
                <TableCell className="font-medium">{item.description}</TableCell>
                <TableCell>{item.size}</TableCell>
                <TableCell>{item.type}</TableCell>
                {pricingFields.map((f) => (
                  <TableCell key={f} className="text-right font-mono">
                    {formatPrice(item[f as keyof ProductItem] as string | number | null)}
                  </TableCell>
                ))}
                <TableCell>
                  <Badge variant={item.isActive ? "default" : "secondary"}>
                    {item.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditItem(item);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleActive(item)}
                    >
                      {item.isActive ? (
                        <Ban className="h-3.5 w-3.5 text-destructive" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ProductDialog
        libraryType={libraryType}
        product={editItem}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditItem(undefined);
        }}
      />
    </>
  );
}
