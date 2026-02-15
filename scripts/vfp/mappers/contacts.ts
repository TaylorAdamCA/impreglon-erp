import type { DbfRecord } from "../reader";

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function mapContact(record: DbfRecord) {
  if (!record.custno || record.custno === 0) return null;

  const name = trimOrNull(record.contactname);
  if (!name) return null;

  return {
    custNo: record.custno as number,
    name,
    title: trimOrNull(record.title),
    phone: trimOrNull(record.phone),
    email: trimOrNull(record.email),
    department: trimOrNull(record.department),
    isPrimary: false,
  };
}
