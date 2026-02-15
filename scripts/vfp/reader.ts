import { DBFFile } from "dbffile";

export interface DbfRecord {
  [key: string]: unknown;
  _deleted?: boolean;
}

export async function readDbfRecords(
  filePath: string,
  options?: { includeDeleted?: boolean }
): Promise<DbfRecord[]> {
  const dbf = await DBFFile.open(filePath);
  const records = (await dbf.readRecords()) as DbfRecord[];

  if (options?.includeDeleted) {
    return records;
  }

  return records.filter((r) => !r._deleted);
}
