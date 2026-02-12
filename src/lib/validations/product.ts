import { z } from "zod";

export const LIBRARY_TYPES = [
  "VALVE",
  "VALVE1",
  "VALVE2",
  "WELL_VALVE",
  "FITTING",
  "PUP",
  "WELL_COMPONENT",
  "ACCESSORY",
] as const;

export type LibraryType = (typeof LIBRARY_TYPES)[number];

export const LIBRARY_TYPE_LABELS: Record<LibraryType, string> = {
  VALVE: "Valve",
  VALVE1: "Valve 1",
  VALVE2: "Valve 2",
  WELL_VALVE: "Well Valve",
  FITTING: "Fitting",
  PUP: "PUP",
  WELL_COMPONENT: "Well Component",
  ACCESSORY: "Accessory",
};

/** Which pricing fields are relevant per library type */
export const PRICING_FIELDS: Record<LibraryType, string[]> = {
  VALVE: ["price7", "price8"],
  VALVE1: ["price7", "price8"],
  VALVE2: ["price7", "price8"],
  WELL_VALVE: ["price7", "price8"],
  FITTING: ["price1", "price2", "price3"],
  PUP: ["price1", "price2"],
  WELL_COMPONENT: ["price1", "price2"],
  ACCESSORY: ["price1", "price2"],
};

export const PRICE_LABELS: Record<string, string> = {
  price1: "Base Price",
  price2: "Tier 2",
  price3: "Tier 3 (Calculated)",
  price7: "Standard",
  price8: "Premium",
};

export const productSchema = z.object({
  libraryType: z.enum(LIBRARY_TYPES),
  description: z.string().min(1, "Description is required").max(500),
  size: z.string().max(100).optional().or(z.literal("")),
  type: z.string().max(100).optional().or(z.literal("")),
  price1: z.string().optional().or(z.literal("")),
  price2: z.string().optional().or(z.literal("")),
  price3: z.string().optional().or(z.literal("")),
  price7: z.string().optional().or(z.literal("")),
  price8: z.string().optional().or(z.literal("")),
});

export type ProductFormValues = z.infer<typeof productSchema>;
