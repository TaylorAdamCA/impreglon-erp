import { prisma } from "@/lib/prisma";

/** Calculate GST amount: orderTotal x (rate / 100), rounded to 2 decimals */
export function calculateGst(orderTotal: number, rate: number): number {
  return Math.round(orderTotal * (rate / 100) * 100) / 100;
}

/** Look up GST rate from TaxRate table for a given date. Returns rate or null. */
export async function lookupGstRate(date: Date): Promise<number | null> {
  const taxRate = await prisma.taxRate.findFirst({
    where: {
      taxId: "GST",
      effectiveDate: { lte: date },
      expiryDate: { gte: date },
    },
  });

  return taxRate ? Number(taxRate.rate) : null;
}
