import type { DbfRecord } from "../reader";

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

const VALID_STATUSES = ["ACTIVE", "RECEIVED", "IN_USE", "RETIRED"];

export function mapTool(record: DbfRecord) {
  const toolNo = record.toolno as number;
  if (!toolNo || toolNo === 0) return null;

  const rawStatus = trimOrNull(record.status)?.toUpperCase() ?? "ACTIVE";
  const status = VALID_STATUSES.includes(rawStatus) ? rawStatus : "ACTIVE";

  return {
    toolNo,
    description: trimOrNull(record.description) ?? "",
    toolType: trimOrNull(record.tooltype),
    status,
    price: record.price != null ? Number(record.price) : null,
    owner: trimOrNull(record.owner),
    location: trimOrNull(record.location),
    isProprietary: false,
  };
}

export function mapToolPart(record: DbfRecord) {
  const toolNo = record.toolno as number;
  if (!toolNo || toolNo === 0) return null;

  return {
    toolNo,
    partNo: trimOrNull(record.partno) ?? "",
    description: trimOrNull(record.description) ?? "",
    price: record.price != null ? Number(record.price) : null,
    quantity: (record.quantity as number) ?? 1,
  };
}
