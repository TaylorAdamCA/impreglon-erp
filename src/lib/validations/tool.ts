import { z } from "zod";

export const TOOL_STATUSES = ["ACTIVE", "RECEIVED", "IN_USE", "RETIRED"] as const;

export const toolSchema = z.object({
  description: z.string().min(1, "Description is required").max(500),
  toolType: z.string().max(100).optional().or(z.literal("")),
  price: z.number().min(0, "Price cannot be negative").optional(),
  owner: z.string().max(200).optional().or(z.literal("")),
  location: z.string().max(200).optional().or(z.literal("")),
  isProprietary: z.boolean().optional(),
});

export type ToolFormValues = z.infer<typeof toolSchema>;

export const toolPartSchema = z.object({
  partNo: z.string().min(1, "Part number is required").max(100),
  description: z.string().min(1, "Description is required").max(500),
  price: z.number().min(0).optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1").optional().default(1),
});

export type ToolPartFormValues = z.infer<typeof toolPartSchema>;

export const toolAssignmentSchema = z.object({
  orderId: z.string().min(1, "Order is required"),
  assignment: z.string().max(500).optional().or(z.literal("")),
});

export type ToolAssignmentFormValues = z.infer<typeof toolAssignmentSchema>;

export const toolReceiptSchema = z.object({
  condition: z.string().max(200).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type ToolReceiptFormValues = z.infer<typeof toolReceiptSchema>;

export const toolStatusSchema = z.object({
  status: z.enum(TOOL_STATUSES),
});

export type ToolStatusFormValues = z.infer<typeof toolStatusSchema>;
