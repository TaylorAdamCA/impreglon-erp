import { z } from "zod";

export const PERCENT_COMPLETE_VALUES = [0, 25, 50, 75, 100] as const;

export const seedPeriodSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export type SeedPeriodValues = z.infer<typeof seedPeriodSchema>;

export const updatePercentSchema = z.object({
  percentComplete: z
    .number()
    .int()
    .refine((val) => PERCENT_COMPLETE_VALUES.includes(val as (typeof PERCENT_COMPLETE_VALUES)[number]), {
      message: "Percent complete must be 0, 25, 50, 75, or 100",
    }),
});

export type UpdatePercentValues = z.infer<typeof updatePercentSchema>;
