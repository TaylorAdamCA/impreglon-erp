import { z } from "zod";

export const failureTypeSchema = z.object({
  code: z.string().min(1, "Code is required").max(50),
  description: z.string().min(1, "Description is required").max(500),
});

export type FailureTypeInput = z.infer<typeof failureTypeSchema>;

export const updateFailureTypeSchema = z.object({
  code: z.string().min(1, "Code is required").max(50),
  description: z.string().min(1, "Description is required").max(500),
  isActive: z.boolean().optional(),
});

export type UpdateFailureTypeInput = z.infer<typeof updateFailureTypeSchema>;

export const FAILURE_TYPE_CATEGORIES = ["coating", "method"] as const;
export type FailureTypeCategory = (typeof FAILURE_TYPE_CATEGORIES)[number];
