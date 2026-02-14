import { z } from "zod";

export const invoiceDraftSchema = z.object({
  notes: z.string().max(2000).optional().or(z.literal("")),
  gstOverride: z.number().min(0, "GST amount cannot be negative").optional(),
});

export type InvoiceDraftValues = z.infer<typeof invoiceDraftSchema>;

export const invoiceModifySchema = z.object({
  notes: z.string().max(2000).optional().or(z.literal("")),
  gstOverride: z.number().min(0, "GST amount cannot be negative").optional(),
});

export type InvoiceModifyValues = z.infer<typeof invoiceModifySchema>;
