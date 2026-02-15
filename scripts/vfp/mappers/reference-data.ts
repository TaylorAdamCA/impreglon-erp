import type { DbfRecord } from "../reader";

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * VFP coatfailure.dbf / methodfailure.dbf fields:
 * FAILNO(I:4), REASON(C:20)
 *
 * FAILNO is an integer ID used as the code.
 * REASON is the description text.
 */

export function mapCoatingFailure(record: DbfRecord) {
  const failNo = record.FAILNO as number;
  if (!failNo || failNo === 0) return null;
  return {
    code: String(failNo),
    description: trimOrNull(record.REASON) ?? String(failNo),
    isActive: true,
  };
}

export function mapMethodFailure(record: DbfRecord) {
  const failNo = record.FAILNO as number;
  if (!failNo || failNo === 0) return null;
  return {
    code: String(failNo),
    description: trimOrNull(record.REASON) ?? String(failNo),
    isActive: true,
  };
}

/**
 * VFP OPERATIONS.DBF fields:
 * OPERATION(C:25) — single field only!
 *
 * Used as both code and name.
 */

export function mapOperation(record: DbfRecord) {
  const operation = trimOrNull(record.OPERATION);
  if (!operation) return null;
  return {
    code: operation,
    name: operation,
    description: null,
  };
}
