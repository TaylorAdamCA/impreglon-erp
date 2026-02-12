import { z } from "zod";
import { LIBRARY_TYPES } from "./product";

export const createQuoteSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
});

export type CreateQuoteValues = z.infer<typeof createQuoteSchema>;

export const quoteComponentSchema = z.object({
  description: z.string().min(1, "Description is required").max(500),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Price must be non-negative"),
  libraryType: z.enum(LIBRARY_TYPES).optional(),
  libraryItemId: z.string().optional(),
  coatingSlot: z.number().int().min(1).max(8).optional(),
});

export type QuoteComponentValues = z.infer<typeof quoteComponentSchema>;

export const QUOTE_STATUS_ACTIONS = ["submit", "approve", "reject"] as const;

export const quoteStatusSchema = z.object({
  action: z.enum(QUOTE_STATUS_ACTIONS),
  reason: z.string().optional(),
});

export type QuoteStatusValues = z.infer<typeof quoteStatusSchema>;
