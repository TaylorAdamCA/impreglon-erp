import type { DbfRecord } from "../reader";

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isActiveCustomer(record: DbfRecord): boolean {
  if (record._deleted) return false;
  if (!record.custno || record.custno === 0) return false;
  return true;
}

export function mapCustomer(record: DbfRecord) {
  if (!record.custno || record.custno === 0) return null;

  return {
    custNo: record.custno as number,
    company: trimOrNull(record.company) ?? "",
    address1: trimOrNull(record.address1),
    address2: trimOrNull(record.address2),
    city: trimOrNull(record.city),
    province: trimOrNull(record.province),
    postalCode: trimOrNull(record.postal),
    phone: trimOrNull(record.phone),
    fax: trimOrNull(record.fax),
    email: trimOrNull(record.email),
    terms: trimOrNull(record.terms),
    notes: trimOrNull(record.notes),
    isActive: true,
  };
}
