import type { DbfRecord } from "../reader";

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * VFP tools.dbf fields:
 * TOOLNO(I:4), CUSTNO(C:9), TOOLNAME(C:35), NOMINAL(C:20),
 * LONGEST(N:6), PIECES(I:4), PRICE1(N:10), PRICE2(N:10), ACTIVE(L:1)
 *
 * No toolType, status, or location fields in VFP.
 * ACTIVE boolean maps to ACTIVE/RETIRED status.
 * CUSTNO string stored as owner.
 */

export function mapTool(record: DbfRecord) {
  const toolNo = record.TOOLNO as number;
  if (!toolNo || toolNo === 0) return null;

  const isActive = record.ACTIVE !== false;

  return {
    toolNo,
    description: trimOrNull(record.TOOLNAME) ?? "",
    toolType: null,
    status: isActive ? "ACTIVE" : "RETIRED",
    price: record.PRICE1 != null ? Number(record.PRICE1) : null,
    owner: trimOrNull(record.CUSTNO),
    location: null,
    isProprietary: false,
  };
}

/**
 * VFP PARTS.DBF fields:
 * PARTNO(I:4), TOOLNO(I:4), QTY(I:4), PARTNAME(C:35),
 * PRICECODE(I:4), CUSTTAG(C:15), ID(N:10), OD(N:10),
 * LENGTH(N:10), PRICE1(N:10), PRICE2(N:10)
 */

export function mapToolPart(record: DbfRecord) {
  const toolNo = record.TOOLNO as number;
  if (!toolNo || toolNo === 0) return null;

  return {
    toolNo,
    partNo: String(record.PARTNO ?? ""),
    description: trimOrNull(record.PARTNAME) ?? "",
    price: record.PRICE1 != null ? Number(record.PRICE1) : null,
    quantity: (record.QTY as number) ?? 1,
  };
}
