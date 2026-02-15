import type { DbfRecord } from "../reader";

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function mapShipTo(record: DbfRecord) {
  if (!record.custno || record.custno === 0) return null;

  return {
    custNo: record.custno as number,
    name: trimOrNull(record.shipname) ?? "",
    address1: trimOrNull(record.address1),
    address2: trimOrNull(record.address2),
    city: trimOrNull(record.city),
    province: trimOrNull(record.province),
    postalCode: trimOrNull(record.postal),
    isDefault: false,
  };
}
