import type { DbfRecord } from "../reader";

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function mapCarrier(record: DbfRecord) {
  if (!record.custno || record.custno === 0) return null;

  return {
    custNo: record.custno as number,
    name: trimOrNull(record.carriername) ?? "",
    account: trimOrNull(record.account),
    phone: trimOrNull(record.phone),
    isDefault: false,
  };
}
