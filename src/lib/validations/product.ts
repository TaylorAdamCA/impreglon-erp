import { z } from "zod";

export const LIBRARY_TYPES = [
  "ANSI_VALVE",
  "WELLHEAD_VALVE",
  "FITTING",
  "PUP_JOINT",
  "WELLHEAD_COMPONENT",
  "ACCESSORY",
] as const;

export type LibraryType = (typeof LIBRARY_TYPES)[number];

export const LIBRARY_TYPE_LABELS: Record<LibraryType, string> = {
  ANSI_VALVE: "ANSI Valves",
  WELLHEAD_VALVE: "Wellhead Valves",
  FITTING: "Fittings",
  PUP_JOINT: "PUP Joints",
  WELLHEAD_COMPONENT: "Wellhead Components",
  ACCESSORY: "Accessories",
};

/** Whether this library type supports DRT vendor pricing */
export const HAS_DRT: Record<LibraryType, boolean> = {
  ANSI_VALVE: true,
  WELLHEAD_VALVE: true,
  FITTING: false,
  PUP_JOINT: false,
  WELLHEAD_COMPONENT: false,
  ACCESSORY: false,
};

/** Whether this library type supports multiple catalog sources */
export const HAS_CATALOG_SOURCE: Record<LibraryType, boolean> = {
  ANSI_VALVE: true,
  WELLHEAD_VALVE: false,
  FITTING: false,
  PUP_JOINT: false,
  WELLHEAD_COMPONENT: false,
  ACCESSORY: false,
};

export const CATALOG_SOURCES = ["A", "B", "C"] as const;

export const productSchema = z.object({
  libraryType: z.enum(LIBRARY_TYPES),
  catalogSource: z.string().optional().or(z.literal("")),
  description: z.string().min(1, "Description is required").max(500),
  size: z.string().max(100).optional().or(z.literal("")),
  type: z.string().max(100).optional().or(z.literal("")),
});

export type ProductFormValues = z.infer<typeof productSchema>;

export const coatingPriceLabelSchema = z.object({
  libraryType: z.enum(LIBRARY_TYPES),
  slotNumber: z.number().int().min(1).max(8),
  coatingName: z.string().min(1, "Coating name is required"),
  areaSpec: z.string().min(1, "Area spec is required"),
});

export type CoatingPriceLabelValues = z.infer<typeof coatingPriceLabelSchema>;
