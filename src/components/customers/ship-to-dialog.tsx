"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  shipToSchema,
  type ShipToFormValues,
} from "@/lib/validations/customer";
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

interface ShipToDialogProps {
  customerId: string;
  address?: {
    id: string;
    name: string;
    address1: string;
    address2: string | null;
    city: string;
    province: string | null;
    postalCode: string | null;
    isDefault: boolean;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShipToDialog({
  customerId,
  address,
  open,
  onOpenChange,
}: ShipToDialogProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const isEdit = !!address;

  const form = useForm<ShipToFormValues>({
    resolver: zodResolver(shipToSchema),
    defaultValues: address
      ? {
          name: address.name,
          address1: address.address1,
          address2: address.address2 ?? "",
          city: address.city,
          province: address.province ?? "",
          postalCode: address.postalCode ?? "",
          isDefault: address.isDefault,
        }
      : {
          name: "",
          address1: "",
          address2: "",
          city: "",
          province: "",
          postalCode: "",
          isDefault: false,
        },
  });

  async function onSubmit(data: ShipToFormValues) {
    setError("");

    const url = isEdit
      ? `/api/customers/${customerId}/ship-to/${address.id}`
      : `/api/customers/${customerId}/ship-to`;
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

    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Ship-To Address" : "Add Ship-To Address"}
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Main Warehouse" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 2</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Province</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                {...form.register("isDefault")}
                className="rounded border-input"
              />
              <label htmlFor="isDefault" className="text-sm cursor-pointer">
                Default ship-to address
              </label>
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
                    : "Add"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
