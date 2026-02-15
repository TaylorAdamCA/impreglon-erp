import type { DbfRecord } from "../reader";

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * VFP CUSTOMERCONTACTS.DBF fields:
 * CONTACTNO(I:4), CUSTNO(C:9), ATTENTION(C:30),
 * EMAIL(C:40), PHONE(C:14), FAX(C:14), HOMEOFFICE(C:20)
 */

export function mapContact(record: DbfRecord) {
  const custCode = trimOrNull(record.CUSTNO);
  if (!custCode) return null;

  const name = trimOrNull(record.ATTENTION);
  if (!name) return null;

  return {
    custCode,
    name,
    title: null,
    phone: trimOrNull(record.PHONE),
    email: trimOrNull(record.EMAIL),
    department: trimOrNull(record.HOMEOFFICE),
    isPrimary: false,
  };
}
