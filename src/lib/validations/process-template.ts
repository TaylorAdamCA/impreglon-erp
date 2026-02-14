import { z } from "zod";

export const processTemplateStepSchema = z.object({
  operationName: z.string().min(1, "Operation name is required").max(200),
  description: z.string().max(500).optional(),
});

export type ProcessTemplateStepInput = z.infer<typeof processTemplateStepSchema>;

export const createProcessTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(500).optional(),
  steps: z.array(processTemplateStepSchema).min(1, "At least one step is required"),
});

export type CreateProcessTemplateInput = z.infer<typeof createProcessTemplateSchema>;

export const updateProcessTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  steps: z.array(processTemplateStepSchema).min(1, "At least one step is required"),
});

export type UpdateProcessTemplateInput = z.infer<typeof updateProcessTemplateSchema>;
