import type { DbfRecord } from "../reader";

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * VFP customers.dbf fields:
 * CUSTNO(C:9) - string customer code e.g. "GUIBE", "ACADE"
 * NAME(C:40), NAME2(C:40), ADDRESS(C:30), ADDRESS2(C:30)
 * CITY(C:15), PROVINCE(C:15), POSTALCODE(C:7)
 * PHONENO(C:14), FAXNO(C:14), EMAIL_ADD(C:50)
 * ACTIVE(L:1), CUSTMEMO(M:4), CUSTTYPE(C:1)
 */

export function isActiveCustomer(record: DbfRecord): boolean {
  if (record._deleted) return false;
  const custCode = trimOrNull(record.CUSTNO);
  if (!custCode) return false;
  if (record.ACTIVE === false) return false;
  return true;
}

export function mapCustomer(record: DbfRecord) {
  const custCode = trimOrNull(record.CUSTNO);
  if (!custCode) return null;

  return {
    custCode,
    company: trimOrNull(record.NAME) ?? "",
    address1: trimOrNull(record.ADDRESS),
    address2: trimOrNull(record.ADDRESS2),
    city: trimOrNull(record.CITY),
    province: trimOrNull(record.PROVINCE),
    postalCode: trimOrNull(record.POSTALCODE),
    phone: trimOrNull(record.PHONENO),
    fax: trimOrNull(record.FAXNO),
    email: trimOrNull(record.EMAIL_ADD),
    terms: null,
    notes: trimOrNull(record.CUSTMEMO),
    isActive: true,
  };
}
