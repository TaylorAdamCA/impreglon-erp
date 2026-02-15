import type { DbfRecord } from "../reader";

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function mapReference(record: DbfRecord) {
  if (!record.custno || record.custno === 0) return null;

  const reference = trimOrNull(record.reference);
  if (!reference) return null;

  return {
    custNo: record.custno as number,
    reference,
  };
}
