import type { DbfRecord } from "../reader";

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * VFP CARRIERS.DBF fields (only 3!):
 * CARRIERNAM(C:25), CARRIERNO(I:4), CUSTNO(C:9)
 */

export function mapCarrier(record: DbfRecord) {
  const custCode = trimOrNull(record.CUSTNO);
  if (!custCode) return null;

  return {
    custCode,
    name: trimOrNull(record.CARRIERNAM) ?? "",
    account: null,
    phone: null,
    isDefault: false,
  };
}
