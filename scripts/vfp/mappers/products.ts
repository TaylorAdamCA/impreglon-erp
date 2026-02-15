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

export function mapProduct(
  record: DbfRecord,
  libraryType: string
) {
  const partno = record.partno as number;
  if (!partno || partno === 0) return null;

  const description = trimOrNull(record.desc1);
  if (!description) return null;

  const prices: Record<string, number | null> = {};
  for (let i = 1; i <= 14; i++) {
    const vfpField = `price${i}`;
    const prismaField = `coatingPrice${i}`;
    prices[prismaField] = priceOrNull(record[vfpField]);
  }

  return {
    libraryType,
    catalogSource: null,
    libraryNo: partno,
    description,
    size: trimOrNull(record.bore),
    type: record.typeno != null ? String(record.typeno) : null,
    ...prices,
    isActive: true,
  };
}
