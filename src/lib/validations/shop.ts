import { z } from "zod";

export const receiveItemSchema = z.object({
  detailId: z.string().min(1, "Detail ID is required"),
  received: z.boolean(),
});

export type ReceiveItemInput = z.infer<typeof receiveItemSchema>;

export const assignTemplateSchema = z.object({
  templateId: z.string().min(1, "Template ID is required"),
});

export type AssignTemplateInput = z.infer<typeof assignTemplateSchema>;

export const processStepSchema = z.object({
  stepId: z.string().min(1, "Step ID is required"),
  completed: z.boolean(),
  notes: z.string().max(500).optional(),
});

export type ProcessStepInput = z.infer<typeof processStepSchema>;

export const shipOrderSchema = z.object({
  notes: z.string().max(500).optional(),
});

export type ShipOrderInput = z.infer<typeof shipOrderSchema>;
