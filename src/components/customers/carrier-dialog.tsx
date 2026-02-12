"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  carrierSchema,
  type CarrierFormValues,
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

interface CarrierDialogProps {
  customerId: string;
  carrier?: {
    id: string;
    name: string;
    account: string | null;
    phone: string | null;
    isDefault: boolean;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CarrierDialog({
  customerId,
  carrier,
  open,
  onOpenChange,
}: CarrierDialogProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const isEdit = !!carrier;

  const form = useForm<CarrierFormValues>({
    resolver: zodResolver(carrierSchema),
    defaultValues: carrier
      ? {
          name: carrier.name,
          account: carrier.account ?? "",
          phone: carrier.phone ?? "",
          isDefault: carrier.isDefault,
        }
      : {
          name: "",
          account: "",
          phone: "",
          isDefault: false,
        },
  });

  async function onSubmit(data: CarrierFormValues) {
    setError("");

    const url = isEdit
      ? `/api/customers/${customerId}/carriers/${carrier.id}`
      : `/api/customers/${customerId}/carriers`;
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
            {isEdit ? "Edit Carrier" : "Add Carrier"}
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
                  <FormLabel>Carrier Name *</FormLabel>
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
                name="account"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account #</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
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
                id="carrierDefault"
                {...form.register("isDefault")}
                className="rounded border-input"
              />
              <label
                htmlFor="carrierDefault"
                className="text-sm cursor-pointer"
              >
                Default carrier
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
