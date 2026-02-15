import type { DbfRecord } from "../reader";

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * VFP SHIPPING.DBF fields:
 * SHIPNO(I:4), SHIPTO1(C:35), SHIPTO2(C:25), SHIPTO3(C:25), CUSTNO(C:9)
 *
 * These are free-form text lines, not structured address fields.
 * SHIPTO1 → name, SHIPTO2 → address1, SHIPTO3 → city
 */

export function mapShipTo(record: DbfRecord) {
  const custCode = trimOrNull(record.CUSTNO);
  if (!custCode) return null;

  const name = trimOrNull(record.SHIPTO1);
  if (!name) return null;

  return {
    custCode,
    name,
    address1: trimOrNull(record.SHIPTO2) ?? "",
    address2: null,
    city: trimOrNull(record.SHIPTO3) ?? "",
    province: null,
    postalCode: null,
    isDefault: false,
  };
}
