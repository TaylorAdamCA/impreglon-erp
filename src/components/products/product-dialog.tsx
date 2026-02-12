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
  LIBRARY_TYPE_LABELS,
  HAS_CATALOG_SOURCE,
  CATALOG_SOURCES,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductDialogProps {
  libraryType: LibraryType;
  item?: {
    id: string;
    catalogSource: string | null;
    description: string;
    size: string | null;
    type: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDialog({
  libraryType,
  item,
  open,
  onOpenChange,
}: ProductDialogProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const isEdit = !!item;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: item
      ? {
          libraryType,
          catalogSource: item.catalogSource ?? "",
          description: item.description,
          size: item.size ?? "",
          type: item.type ?? "",
        }
      : {
          libraryType,
          catalogSource: "",
          description: "",
          size: "",
          type: "",
        },
  });

  async function onSubmit(data: ProductFormValues) {
    setError("");

    const url = isEdit ? `/api/products/${item.id}` : "/api/products";
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
            {isEdit ? "Edit Item" : `Add ${LIBRARY_TYPE_LABELS[libraryType].replace(/s$/, "")}`}
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
                      <Input placeholder='e.g. 2", 4"' {...field} />
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
                      <Input placeholder="e.g. Gate, Ball, Check" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {HAS_CATALOG_SOURCE[libraryType] && (
              <FormField
                control={form.control}
                name="catalogSource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catalog Source</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select catalog" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATALOG_SOURCES.map((s) => (
                          <SelectItem key={s} value={s}>
                            Catalog {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
