"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  customerSchema,
  type CustomerFormValues,
} from "@/lib/validations/customer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface CustomerFormProps {
  customerId?: string;
  defaultValues?: CustomerFormValues;
}

export function CustomerForm({ customerId, defaultValues }: CustomerFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const isEdit = !!customerId;

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaultValues ?? {
      company: "",
      address1: "",
      address2: "",
      city: "",
      province: "",
      postalCode: "",
      phone: "",
      fax: "",
      email: "",
      terms: "",
      notes: "",
    },
  });

  const isDirty = form.formState.isDirty;

  // Warn on browser close/refresh with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  async function onSubmit(data: CustomerFormValues) {
    setError("");

    const url = isEdit ? `/api/customers/${customerId}` : "/api/customers";
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

    const customer = await res.json();
    if (isEdit) {
      form.reset(data);
      toast.success("Changes saved successfully");
      router.refresh();
    } else {
      toast.success("Customer created successfully");
      router.push(`/customers/${customer.id}`);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Company Name *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address1"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Address Line 1</FormLabel>
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
              <FormItem className="sm:col-span-2">
                <FormLabel>Address Line 2</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
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
            name="fax"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fax</FormLabel>
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

          <FormField
            control={form.control}
            name="terms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Terms</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Net 30" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? "Saving..."
              : isEdit
                ? "Save Changes"
                : "Create Customer"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (
                isDirty &&
                !confirm("You have unsaved changes. Are you sure you want to leave?")
              ) {
                return;
              }
              router.back();
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
