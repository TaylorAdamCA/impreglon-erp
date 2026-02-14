import { z } from "zod";
import { LIBRARY_TYPES } from "./product";

export const createOrderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  poNumber: z.string().max(100).optional().or(z.literal("")),
  shipDate: z.string().optional(),
  dueDate: z.string().optional(),
  gstRate: z.number().min(0).max(100).default(5),
});

export type CreateOrderValues = z.infer<typeof createOrderSchema>;

export const updateOrderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  poNumber: z.string().max(100).optional().or(z.literal("")),
  shipDate: z.string().optional(),
  dueDate: z.string().optional(),
  gstRate: z.number().min(0).max(100).default(5),
});

export type UpdateOrderValues = z.infer<typeof updateOrderSchema>;

export const orderDetailSchema = z.object({
  description: z.string().min(1, "Description is required").max(500),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Price must be non-negative"),
  coating: z.string().max(200).optional().or(z.literal("")),
  libraryType: z.enum(LIBRARY_TYPES).optional(),
  libraryItemId: z.string().optional(),
  coatingSlot: z.number().int().min(1).max(8).optional(),
});

export type OrderDetailValues = z.infer<typeof orderDetailSchema>;

export const ORDER_STATUS_ACTIONS = ["start", "complete", "ready"] as const;

export const orderStatusSchema = z.object({
  action: z.enum(ORDER_STATUS_ACTIONS),
  notes: z.string().optional(),
});

export type OrderStatusValues = z.infer<typeof orderStatusSchema>;
