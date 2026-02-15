import type { DbfRecord } from "../reader";

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function mapCoatingFailure(record: DbfRecord) {
  const code = trimOrNull(record.code);
  if (!code) return null;
  return {
    code,
    description: trimOrNull(record.description) ?? code,
    isActive: true,
  };
}

export function mapMethodFailure(record: DbfRecord) {
  const code = trimOrNull(record.code);
  if (!code) return null;
  return {
    code,
    description: trimOrNull(record.description) ?? code,
    isActive: true,
  };
}

export function mapOperation(record: DbfRecord) {
  const code = trimOrNull(record.code);
  if (!code) return null;
  return {
    code,
    name: trimOrNull(record.name) ?? code,
    description: trimOrNull(record.description),
  };
}
