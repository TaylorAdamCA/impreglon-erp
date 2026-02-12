"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  contactSchema,
  type ContactFormValues,
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

interface ContactDialogProps {
  customerId: string;
  contact?: {
    id: string;
    name: string;
    title: string | null;
    phone: string | null;
    email: string | null;
    department: string | null;
    isPrimary: boolean;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactDialog({
  customerId,
  contact,
  open,
  onOpenChange,
}: ContactDialogProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const isEdit = !!contact;

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: contact
      ? {
          name: contact.name,
          title: contact.title ?? "",
          phone: contact.phone ?? "",
          email: contact.email ?? "",
          department: contact.department ?? "",
          isPrimary: contact.isPrimary,
        }
      : {
          name: "",
          title: "",
          phone: "",
          email: "",
          department: "",
          isPrimary: false,
        },
  });

  async function onSubmit(data: ContactFormValues) {
    setError("");

    const url = isEdit
      ? `/api/customers/${customerId}/contacts/${contact.id}`
      : `/api/customers/${customerId}/contacts`;
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
          <DialogTitle>{isEdit ? "Edit Contact" : "Add Contact"}</DialogTitle>
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
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

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrimary"
                {...form.register("isPrimary")}
                className="rounded border-input"
              />
              <label htmlFor="isPrimary" className="text-sm cursor-pointer">
                Primary contact
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
                {form.formState.isSubmitting ? "Saving..." : isEdit ? "Save" : "Add"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
