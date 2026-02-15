import type { DbfRecord } from "../reader";

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function priceOrNull(value: unknown): number | null {
  if (value == null || value === undefined) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

/**
 * VFP product library fields (uppercase):
 * PARTNO(I), LIBRARYNO(I), QTY(I), DESC1(C:35), BORE(C:24),
 * PIECES(I), PRICE(N), TYPENO(I), LIST(C:1), PRICE1-14(N)
 *
 * Accessory library is different: has CUSTNO, COATING, AREA,
 * single PRICE instead of PRICE1-14, no TYPENO.
 */

export function mapProduct(
  record: DbfRecord,
  libraryType: string
) {
  const partno = record.PARTNO as number;
  if (!partno || partno === 0) return null;

  const description = trimOrNull(record.DESC1);
  if (!description) return null;

  const prices: Record<string, number | null> = {};
  for (let i = 1; i <= 14; i++) {
    const vfpField = `PRICE${i}`;
    const prismaField = `coatingPrice${i}`;
    prices[prismaField] = priceOrNull(record[vfpField]);
  }

  // Accessories have a single PRICE field instead of PRICE1-14
  if (libraryType === "ACCESSORY" && prices.coatingPrice1 == null) {
    prices.coatingPrice1 = priceOrNull(record.PRICE);
  }

  return {
    libraryType,
    catalogSource: null,
    libraryNo: partno,
    description,
    size: trimOrNull(record.BORE),
    type: record.TYPENO != null ? String(record.TYPENO) : null,
    ...prices,
    isActive: true,
  };
}
