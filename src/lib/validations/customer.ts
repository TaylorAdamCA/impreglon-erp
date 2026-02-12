import { z } from "zod";

export const customerSchema = z.object({
  company: z.string().min(1, "Company name is required").max(200),
  address1: z.string().max(200).optional().or(z.literal("")),
  address2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  province: z.string().max(100).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  fax: z.string().max(50).optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  terms: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

export const contactSchema = z.object({
  name: z.string().min(1, "Contact name is required").max(200),
  title: z.string().max(100).optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  department: z.string().max(100).optional().or(z.literal("")),
  isPrimary: z.boolean(),
});

export type ContactFormValues = z.infer<typeof contactSchema>;

export const shipToSchema = z.object({
  name: z.string().min(1, "Ship-to name is required").max(200),
  address1: z.string().min(1, "Address is required").max(200),
  address2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(1, "City is required").max(100),
  province: z.string().max(100).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  isDefault: z.boolean(),
});

export type ShipToFormValues = z.infer<typeof shipToSchema>;

export const carrierSchema = z.object({
  name: z.string().min(1, "Carrier name is required").max(200),
  account: z.string().max(100).optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  isDefault: z.boolean(),
});

export type CarrierFormValues = z.infer<typeof carrierSchema>;
