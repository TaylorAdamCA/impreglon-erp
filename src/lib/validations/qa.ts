import { z } from "zod";

export const inspectItemSchema = z.object({
  detailId: z.string().min(1, "Detail ID is required"),
  currentPass: z.number().int().min(0, "Current pass must be non-negative"),
  reworkQty: z.number().int().min(0, "Rework quantity must be non-negative").optional(),
});

export type InspectItemInput = z.infer<typeof inspectItemSchema>;

export const qaStatusSchema = z.object({
  action: z.enum(["rework", "pass", "return"]),
  notes: z.string().max(500).optional(),
});

export type QaStatusInput = z.infer<typeof qaStatusSchema>;

export const reworkPlanSchema = z.object({
  reworkId: z.string().min(1, "Rework ID is required"),
  productType: z.enum(["222M", "505", "Other", "Custom", "Re-Rework"]),
  templateId: z.string().optional(),
  qaNotes: z.string().max(2000).optional(),
  coatingFailure: z.string().max(200).optional(),
  methodFailure: z.string().max(200).optional(),
  operations: z.string().max(500).optional(),
  department: z.string().max(200).optional(),
});

export type ReworkPlanInput = z.infer<typeof reworkPlanSchema>;

export const reworkActionSchema = z.object({
  action: z.enum(["start", "resolve"]),
});

export type ReworkActionInput = z.infer<typeof reworkActionSchema>;
