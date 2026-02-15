import type { DbfRecord } from "../reader";

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * VFP CUST_REFERENCES.DBF fields:
 * CUSTNO(C:9), REF_LABEL1-5(C:15)
 *
 * Each row can have up to 5 reference labels.
 * Each non-empty label becomes a separate CustomerReference record.
 */

export function mapReferences(
  record: DbfRecord
): Array<{ custCode: string; reference: string }> {
  const custCode = trimOrNull(record.CUSTNO);
  if (!custCode) return [];

  const results: Array<{ custCode: string; reference: string }> = [];
  for (let i = 1; i <= 5; i++) {
    const label = trimOrNull(record[`REF_LABEL${i}`]);
    if (label) {
      results.push({ custCode, reference: label });
    }
  }
  return results;
}
