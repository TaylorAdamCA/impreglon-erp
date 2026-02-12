"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  productSchema,
  type ProductFormValues,
  type LibraryType,
  PRICING_FIELDS,
  PRICE_LABELS,
} from "@/lib/validations/product";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface ProductDialogProps {
  libraryType: LibraryType;
  product?: {
    id: string;
    description: string;
    size: string | null;
    type: string | null;
    price1: string | number | null;
    price2: string | number | null;
    price3: string | number | null;
    price7: string | number | null;
    price8: string | number | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toStr(v: string | number | null | undefined): string {
  if (v == null) return "";
  return String(v);
}

export function ProductDialog({
  libraryType,
  product,
  open,
  onOpenChange,
}: ProductDialogProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const isEdit = !!product;

  const pricingFields = PRICING_FIELDS[libraryType];

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          libraryType,
          description: product.description,
          size: product.size ?? "",
          type: product.type ?? "",
          price1: toStr(product.price1),
          price2: toStr(product.price2),
          price3: toStr(product.price3),
          price7: toStr(product.price7),
          price8: toStr(product.price8),
        }
      : {
          libraryType,
          description: "",
          size: "",
          type: "",
          price1: "",
          price2: "",
          price3: "",
          price7: "",
          price8: "",
        },
  });

  async function onSubmit(data: ProductFormValues) {
    setError("");

    const url = isEdit ? `/api/products/${product.id}` : "/api/products";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Something went wrong");
      return;
    }

    toast.success(isEdit ? "Item updated" : "Item added");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Library Item" : "Add Library Item"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {pricingFields.map((field) => {
                const isCalculated =
                  field === "price3" && libraryType === "FITTING";

                return (
                  <FormField
                    key={field}
                    control={form.control}
                    name={field as keyof ProductFormValues}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>{PRICE_LABELS[field]}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            disabled={isCalculated}
                            {...f}
                            value={f.value as string}
                          />
                        </FormControl>
                        {isCalculated && (
                          <p className="text-xs text-muted-foreground">
                            Auto-calculated: Base Price x 1.1
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                );
              })}
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Saving..."
                  : isEdit
                    ? "Save"
                    : "Add Item"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
