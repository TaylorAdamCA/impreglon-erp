# VFP Data Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate reference and master data from VFP DBF tables into PostgreSQL via a one-time migration script.

**Architecture:** Standalone TypeScript script using `dbffile` to read VFP `.dbf` files, mapper functions to transform VFP records into Prisma create inputs, and the Prisma client to upsert into PostgreSQL. Mappers are unit-testable; orchestrator is verified by running against real DBF files.

**Tech Stack:** dbffile (DBF reader), Prisma client, TypeScript, Vitest

---

## Context

**VFP source directory:** `C:\Users\Taylor\Desktop\Misc\From Old PC\Work\Impreglon\FoxPro\Database\`

**Tables to migrate:**

| VFP Table | Location | Target Prisma Model |
|-----------|----------|-------------------|
| `customers.dbf` | Database/ | Customer |
| `CUSTOMERCONTACTS.DBF` | Database/ | CustomerContact |
| `SHIPPING.DBF` | Database/ | ShipToAddress |
| `CARRIERS.DBF` | Database/ | Carrier |
| `CUST_REFERENCES.DBF` | Database/ | CustomerReference |
| `valvelibrary.dbf` | Database/Libraries/ | ProductLibraryItem (ANSI_VALVE) |
| `fittingslibrary.dbf` | Database/Libraries/ | ProductLibraryItem (FITTING) |
| `puplibrary.dbf` | Database/Libraries/ | ProductLibraryItem (PUP_JOINT) |
| `wellvalvelibrary.dbf` | Database/Libraries/ | ProductLibraryItem (WELLHEAD_VALVE) |
| `wellcomponentlibrary.dbf` | Database/Libraries/ | ProductLibraryItem (WELLHEAD_COMPONENT) |
| `accessorylibrary.dbf` | Database/Libraries/ | ProductLibraryItem (ACCESSORY) |
| `tools.dbf` | Database/ | Tool |
| `PARTS.DBF` | Database/ | ToolPart |
| `coatfailure.dbf` | Database/ | CoatingFailure |
| `methodfailure.dbf` | Database/ | MethodFailure |
| `OPERATIONS.DBF` | Database/ | Operation |

**Schema issue:** VFP valve libraries have `price1`–`price14` (14 price columns) but the Prisma `ProductLibraryItem` model only has `coatingPrice1`–`coatingPrice8`. Task 1 adds `coatingPrice9`–`coatingPrice14` via a Prisma migration.

**VFP deletion handling:** VFP uses a record-level deletion flag (soft delete). The `dbffile` package exposes this. We skip VFP-deleted records for customers (user wants "active only").

**Field mapping notes:**
- VFP `partno` → Prisma `libraryNo` (unique row identifier within a library type)
- VFP `libraryno` → Not mapped (grouping concept, not in Prisma schema)
- VFP `desc1` → Prisma `description`
- VFP `bore` → Prisma `size`
- VFP `typeno` → Prisma `type` (as string)
- VFP `custno` → Prisma `custNo`
- VFP character fields → `.trim()` to remove VFP padding

---

### Task 1: Add coatingPrice9–14 to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma` (ProductLibraryItem model, ~line 562–569)

**Step 1: Edit schema.prisma**

Add after `coatingPrice8`:

```prisma
  coatingPrice9  Decimal? @db.Decimal(10, 2)
  coatingPrice10 Decimal? @db.Decimal(10, 2)
  coatingPrice11 Decimal? @db.Decimal(10, 2)
  coatingPrice12 Decimal? @db.Decimal(10, 2)
  coatingPrice13 Decimal? @db.Decimal(10, 2)
  coatingPrice14 Decimal? @db.Decimal(10, 2)
```

Also update the `CoatingPriceLabel` model comment to say "1-14" instead of "1-8", and update the `slotNumber` range in the `@@unique` constraint comment if any.

**Step 2: Run Prisma migration**

Run: `npx prisma migrate dev --name add-coating-prices-9-14`
Expected: Migration created, schema updated.

**Step 3: Generate Prisma client**

Run: `npx prisma generate`
Expected: Client regenerated with new fields.

**Step 4: Verify build**

Run: `npx next build`
Expected: Build passes.

**Step 5: Commit**

```bash
git add prisma/
git commit -m "feat: add coatingPrice9-14 to ProductLibraryItem schema"
```

---

### Task 2: Install dbffile and create DBF reader utility

**Files:**
- Modify: `package.json` (add dbffile dependency)
- Create: `scripts/vfp/reader.ts`
- Create: `scripts/vfp/reader.test.ts`

**Step 1: Install dbffile**

Run: `npm install dbffile`

**Step 2: Write the failing test**

```typescript
// scripts/vfp/reader.test.ts
import { describe, it, expect, vi } from "vitest";
import { readDbfRecords } from "./reader";

// We test the interface — readDbfRecords returns an array of record objects
// and filters out VFP-deleted records by default
describe("readDbfRecords", () => {
  it("should export a function", () => {
    expect(typeof readDbfRecords).toBe("function");
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npx vitest run scripts/vfp/reader.test.ts`
Expected: FAIL — module not found

**Step 4: Implement the reader**

```typescript
// scripts/vfp/reader.ts
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
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run scripts/vfp/reader.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add package.json package-lock.json scripts/
git commit -m "feat: add dbffile dependency and DBF reader utility"
```

---

### Task 3: Customer mapper (TDD)

**Files:**
- Create: `scripts/vfp/mappers/customers.ts`
- Create: `scripts/vfp/mappers/customers.test.ts`

**Step 1: Write the failing tests**

```typescript
// scripts/vfp/mappers/customers.test.ts
import { describe, it, expect } from "vitest";
import { mapCustomer, isActiveCustomer } from "./customers";

describe("mapCustomer", () => {
  const validRecord = {
    custno: 101,
    company: "Acme Oil Ltd          ", // VFP pads with spaces
    address1: "123 Main St           ",
    address2: "                      ",
    city: "Calgary               ",
    province: "AB    ",
    postal: "T2P 1J9   ",
    phone: "403-555-1234  ",
    fax: "403-555-1235  ",
    email: "info@acme.com         ",
    terms: "Net 30    ",
    notes: "Good customer",
  };

  it("maps VFP customer record to Prisma CustomerCreateInput", () => {
    const result = mapCustomer(validRecord);
    expect(result).toEqual({
      custNo: 101,
      company: "Acme Oil Ltd",
      address1: "123 Main St",
      address2: null,
      city: "Calgary",
      province: "AB",
      postalCode: "T2P 1J9",
      phone: "403-555-1234",
      fax: "403-555-1235",
      email: "info@acme.com",
      terms: "Net 30",
      notes: "Good customer",
      isActive: true,
    });
  });

  it("trims VFP character field padding", () => {
    const result = mapCustomer(validRecord);
    expect(result.company).toBe("Acme Oil Ltd");
    expect(result.city).toBe("Calgary");
  });

  it("converts empty strings to null", () => {
    const record = { ...validRecord, address2: "          ", fax: "" };
    const result = mapCustomer(record);
    expect(result.address2).toBeNull();
    expect(result.fax).toBeNull();
  });

  it("skips records with custno 0", () => {
    const record = { ...validRecord, custno: 0 };
    const result = mapCustomer(record);
    expect(result).toBeNull();
  });
});

describe("isActiveCustomer", () => {
  it("returns true for non-deleted records", () => {
    expect(isActiveCustomer({ custno: 1, _deleted: false })).toBe(true);
  });

  it("returns false for deleted records", () => {
    expect(isActiveCustomer({ custno: 1, _deleted: true })).toBe(false);
  });

  it("returns false for records with custno 0", () => {
    expect(isActiveCustomer({ custno: 0 })).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/vfp/mappers/customers.test.ts`
Expected: FAIL — module not found

**Step 3: Implement the mapper**

```typescript
// scripts/vfp/mappers/customers.ts
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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/vfp/mappers/customers.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/vfp/mappers/
git commit -m "feat: add VFP customer mapper with tests"
```

---

### Task 4: Contact, ShipTo, Carrier, Reference mappers (TDD)

**Files:**
- Create: `scripts/vfp/mappers/contacts.ts`
- Create: `scripts/vfp/mappers/contacts.test.ts`
- Create: `scripts/vfp/mappers/ship-to.ts`
- Create: `scripts/vfp/mappers/ship-to.test.ts`
- Create: `scripts/vfp/mappers/carriers.ts`
- Create: `scripts/vfp/mappers/carriers.test.ts`
- Create: `scripts/vfp/mappers/references.ts`
- Create: `scripts/vfp/mappers/references.test.ts`

**Step 1: Write the failing tests**

```typescript
// scripts/vfp/mappers/contacts.test.ts
import { describe, it, expect } from "vitest";
import { mapContact } from "./contacts";

describe("mapContact", () => {
  it("maps VFP contact record with trimming", () => {
    const result = mapContact({
      custno: 101,
      contactname: "John Smith        ",
      title: "VP Operations     ",
      phone: "403-555-9999  ",
      email: "john@acme.com     ",
      department: "Operations    ",
    });
    expect(result).toEqual({
      custNo: 101,
      name: "John Smith",
      title: "VP Operations",
      phone: "403-555-9999",
      email: "john@acme.com",
      department: "Operations",
      isPrimary: false,
    });
  });

  it("returns null for records with custno 0", () => {
    expect(mapContact({ custno: 0, contactname: "Test" })).toBeNull();
  });

  it("returns null for records with empty contactname", () => {
    expect(mapContact({ custno: 1, contactname: "        " })).toBeNull();
  });
});
```

```typescript
// scripts/vfp/mappers/ship-to.test.ts
import { describe, it, expect } from "vitest";
import { mapShipTo } from "./ship-to";

describe("mapShipTo", () => {
  it("maps VFP shipping record with trimming", () => {
    const result = mapShipTo({
      custno: 101,
      shipname: "Acme Warehouse    ",
      address1: "456 Industrial Ave",
      city: "Edmonton          ",
      province: "AB    ",
      postal: "T5J 1S9   ",
    });
    expect(result).toEqual({
      custNo: 101,
      name: "Acme Warehouse",
      address1: "456 Industrial Ave",
      address2: null,
      city: "Edmonton",
      province: "AB",
      postalCode: "T5J 1S9",
      isDefault: false,
    });
  });

  it("returns null for records with custno 0", () => {
    expect(mapShipTo({ custno: 0, shipname: "Test" })).toBeNull();
  });
});
```

```typescript
// scripts/vfp/mappers/carriers.test.ts
import { describe, it, expect } from "vitest";
import { mapCarrier } from "./carriers";

describe("mapCarrier", () => {
  it("maps VFP carrier record with trimming", () => {
    const result = mapCarrier({
      custno: 101,
      carriername: "Day & Ross        ",
      account: "ACC-12345  ",
      phone: "1-800-555-0000",
    });
    expect(result).toEqual({
      custNo: 101,
      name: "Day & Ross",
      account: "ACC-12345",
      phone: "1-800-555-0000",
      isDefault: false,
    });
  });

  it("returns null for records with custno 0", () => {
    expect(mapCarrier({ custno: 0, carriername: "Test" })).toBeNull();
  });
});
```

```typescript
// scripts/vfp/mappers/references.test.ts
import { describe, it, expect } from "vitest";
import { mapReference } from "./references";

describe("mapReference", () => {
  it("maps VFP reference record with trimming", () => {
    const result = mapReference({
      custno: 101,
      reference: "PO-2024-001       ",
    });
    expect(result).toEqual({
      custNo: 101,
      reference: "PO-2024-001",
    });
  });

  it("returns null for empty reference", () => {
    expect(mapReference({ custno: 101, reference: "     " })).toBeNull();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run scripts/vfp/mappers/contacts.test.ts scripts/vfp/mappers/ship-to.test.ts scripts/vfp/mappers/carriers.test.ts scripts/vfp/mappers/references.test.ts`
Expected: FAIL — modules not found

**Step 3: Implement all four mappers**

Each mapper follows the same pattern: trim strings, null-ify empties, validate custno, return mapped object or null.

**`scripts/vfp/mappers/contacts.ts`:**
```typescript
import type { DbfRecord } from "../reader";

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function mapContact(record: DbfRecord) {
  const custNo = record.custno as number;
  if (!custNo || custNo === 0) return null;
  const name = trimOrNull(record.contactname);
  if (!name) return null;

  return {
    custNo,
    name,
    title: trimOrNull(record.title),
    phone: trimOrNull(record.phone),
    email: trimOrNull(record.email),
    department: trimOrNull(record.department),
    isPrimary: false,
  };
}
```

**`scripts/vfp/mappers/ship-to.ts`:**
```typescript
import type { DbfRecord } from "../reader";

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function mapShipTo(record: DbfRecord) {
  const custNo = record.custno as number;
  if (!custNo || custNo === 0) return null;

  return {
    custNo,
    name: trimOrNull(record.shipname) ?? "",
    address1: trimOrNull(record.address1) ?? "",
    address2: trimOrNull(record.address2),
    city: trimOrNull(record.city) ?? "",
    province: trimOrNull(record.province),
    postalCode: trimOrNull(record.postal),
    isDefault: false,
  };
}
```

**`scripts/vfp/mappers/carriers.ts`:**
```typescript
import type { DbfRecord } from "../reader";

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function mapCarrier(record: DbfRecord) {
  const custNo = record.custno as number;
  if (!custNo || custNo === 0) return null;

  return {
    custNo,
    name: trimOrNull(record.carriername) ?? "",
    account: trimOrNull(record.account),
    phone: trimOrNull(record.phone),
    isDefault: false,
  };
}
```

**`scripts/vfp/mappers/references.ts`:**
```typescript
import type { DbfRecord } from "../reader";

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function mapReference(record: DbfRecord) {
  const custNo = record.custno as number;
  if (!custNo || custNo === 0) return null;
  const reference = trimOrNull(record.reference);
  if (!reference) return null;

  return { custNo, reference };
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/vfp/mappers/`
Expected: All PASS

**Step 5: Commit**

```bash
git add scripts/vfp/mappers/
git commit -m "feat: add VFP contact, ship-to, carrier, reference mappers with tests"
```

---

### Task 5: Product library mapper (TDD)

**Files:**
- Create: `scripts/vfp/mappers/products.ts`
- Create: `scripts/vfp/mappers/products.test.ts`

**Step 1: Write the failing tests**

```typescript
// scripts/vfp/mappers/products.test.ts
import { describe, it, expect } from "vitest";
import { mapProduct } from "./products";

describe("mapProduct", () => {
  const valveRecord = {
    partno: 593,
    libraryno: 2,
    desc1: "Globe/Control Valve   ",
    bore: '8" 600#               ',
    pieces: 1,
    typeno: 7,
    price1: 809.01,
    price2: 0.0,
    price3: 1555.26,
    price4: 0.0,
    price5: 889.92,
    price6: 0.0,
    price7: 348.50,
    price8: 348.50,
    price9: 585.00,
    price10: 585.00,
    price11: 453.05,
    price12: 453.05,
    price13: 760.50,
    price14: 760.50,
  };

  it("maps VFP valve record to Prisma ProductLibraryItem", () => {
    const result = mapProduct(valveRecord, "ANSI_VALVE");
    expect(result).toEqual({
      libraryType: "ANSI_VALVE",
      catalogSource: null,
      libraryNo: 593,
      description: "Globe/Control Valve",
      size: '8" 600#',
      type: "7",
      coatingPrice1: 809.01,
      coatingPrice2: 0.0,
      coatingPrice3: 1555.26,
      coatingPrice4: 0.0,
      coatingPrice5: 889.92,
      coatingPrice6: 0.0,
      coatingPrice7: 348.50,
      coatingPrice8: 348.50,
      coatingPrice9: 585.00,
      coatingPrice10: 585.00,
      coatingPrice11: 453.05,
      coatingPrice12: 453.05,
      coatingPrice13: 760.50,
      coatingPrice14: 760.50,
      isActive: true,
    });
  });

  it("maps a fitting record", () => {
    const fittingRecord = {
      partno: 100,
      libraryno: 1,
      desc1: "2-inch Elbow    ",
      bore: '2"    ',
      pieces: 1,
      typeno: 3,
      price1: 50.0,
      price2: 75.0,
      price3: 55.0,
    };
    const result = mapProduct(fittingRecord, "FITTING");
    expect(result?.libraryType).toBe("FITTING");
    expect(result?.libraryNo).toBe(100);
    expect(result?.coatingPrice1).toBe(50.0);
    expect(result?.coatingPrice3).toBe(55.0);
  });

  it("returns null for records with partno 0", () => {
    const result = mapProduct({ ...valveRecord, partno: 0 }, "ANSI_VALVE");
    expect(result).toBeNull();
  });

  it("returns null for records with empty description", () => {
    const result = mapProduct({ ...valveRecord, desc1: "      " }, "ANSI_VALVE");
    expect(result).toBeNull();
  });

  it("treats missing price fields as null", () => {
    const sparseRecord = {
      partno: 200,
      desc1: "Simple Item   ",
      bore: "",
      typeno: 1,
      price1: 100.0,
    };
    const result = mapProduct(sparseRecord, "PUP_JOINT");
    expect(result?.coatingPrice1).toBe(100.0);
    expect(result?.coatingPrice2).toBeNull();
    expect(result?.coatingPrice14).toBeNull();
  });

  it("converts zero prices to the number 0 (not null)", () => {
    const result = mapProduct(valveRecord, "ANSI_VALVE");
    expect(result?.coatingPrice2).toBe(0.0);
    expect(result?.coatingPrice4).toBe(0.0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/vfp/mappers/products.test.ts`
Expected: FAIL — module not found

**Step 3: Implement the mapper**

```typescript
// scripts/vfp/mappers/products.ts
import type { DbfRecord } from "../reader";

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function priceOrNull(value: unknown): number | null {
  if (value == null || value === undefined) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

const PRICE_FIELDS = Array.from({ length: 14 }, (_, i) => `price${i + 1}`);

export function mapProduct(
  record: DbfRecord,
  libraryType: string
) {
  const partno = record.partno as number;
  if (!partno || partno === 0) return null;

  const description = trimOrNull(record.desc1);
  if (!description) return null;

  const prices: Record<string, number | null> = {};
  for (let i = 1; i <= 14; i++) {
    const vfpField = `price${i}`;
    const prismaField = `coatingPrice${i}`;
    prices[prismaField] = priceOrNull(record[vfpField]);
  }

  return {
    libraryType,
    catalogSource: null,
    libraryNo: partno,
    description,
    size: trimOrNull(record.bore),
    type: record.typeno != null ? String(record.typeno) : null,
    ...prices,
    isActive: true,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/vfp/mappers/products.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/vfp/mappers/products.ts scripts/vfp/mappers/products.test.ts
git commit -m "feat: add VFP product library mapper with tests"
```

---

### Task 6: Tool + ToolPart mapper (TDD)

**Files:**
- Create: `scripts/vfp/mappers/tools.ts`
- Create: `scripts/vfp/mappers/tools.test.ts`

**Step 1: Write the failing tests**

```typescript
// scripts/vfp/mappers/tools.test.ts
import { describe, it, expect } from "vitest";
import { mapTool, mapToolPart } from "./tools";

describe("mapTool", () => {
  it("maps VFP tool record", () => {
    const result = mapTool({
      toolno: 42,
      description: "3-inch Mandrel    ",
      tooltype: "MANDREL   ",
      status: "ACTIVE    ",
      price: 1250.0,
      owner: "Acme Oil  ",
      location: "Shop A    ",
    });
    expect(result).toEqual({
      toolNo: 42,
      description: "3-inch Mandrel",
      toolType: "MANDREL",
      status: "ACTIVE",
      price: 1250.0,
      owner: "Acme Oil",
      location: "Shop A",
      isProprietary: false,
    });
  });

  it("returns null for toolno 0", () => {
    expect(mapTool({ toolno: 0, description: "Test" })).toBeNull();
  });

  it("maps VFP status strings to ToolStatus enum values", () => {
    expect(mapTool({ toolno: 1, description: "T", status: "ACTIVE" })?.status).toBe("ACTIVE");
    expect(mapTool({ toolno: 1, description: "T", status: "RECEIVED" })?.status).toBe("RECEIVED");
    expect(mapTool({ toolno: 1, description: "T", status: "IN_USE" })?.status).toBe("IN_USE");
    // Unknown statuses default to ACTIVE
    expect(mapTool({ toolno: 1, description: "T", status: "UNKNOWN" })?.status).toBe("ACTIVE");
  });
});

describe("mapToolPart", () => {
  it("maps VFP parts record", () => {
    const result = mapToolPart({
      toolno: 42,
      partno: "P-001     ",
      description: "Bearing   ",
      price: 85.5,
      quantity: 2,
    });
    expect(result).toEqual({
      toolNo: 42,
      partNo: "P-001",
      description: "Bearing",
      price: 85.5,
      quantity: 2,
    });
  });

  it("returns null for toolno 0", () => {
    expect(mapToolPart({ toolno: 0, partno: "P-001", description: "Test" })).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/vfp/mappers/tools.test.ts`
Expected: FAIL — module not found

**Step 3: Implement the mapper**

```typescript
// scripts/vfp/mappers/tools.ts
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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/vfp/mappers/tools.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/vfp/mappers/tools.ts scripts/vfp/mappers/tools.test.ts
git commit -m "feat: add VFP tool and tool part mappers with tests"
```

---

### Task 7: Reference data mappers — CoatingFailure, MethodFailure, Operation (TDD)

**Files:**
- Create: `scripts/vfp/mappers/reference-data.ts`
- Create: `scripts/vfp/mappers/reference-data.test.ts`

**Step 1: Write the failing tests**

```typescript
// scripts/vfp/mappers/reference-data.test.ts
import { describe, it, expect } from "vitest";
import { mapCoatingFailure, mapMethodFailure, mapOperation } from "./reference-data";

describe("mapCoatingFailure", () => {
  it("maps VFP coating failure record", () => {
    const result = mapCoatingFailure({
      code: "CF001     ",
      description: "Adhesion Loss     ",
    });
    expect(result).toEqual({
      code: "CF001",
      description: "Adhesion Loss",
      isActive: true,
    });
  });

  it("returns null for empty code", () => {
    expect(mapCoatingFailure({ code: "    ", description: "Test" })).toBeNull();
  });
});

describe("mapMethodFailure", () => {
  it("maps VFP method failure record", () => {
    const result = mapMethodFailure({
      code: "MF001     ",
      description: "Process Error     ",
    });
    expect(result).toEqual({
      code: "MF001",
      description: "Process Error",
      isActive: true,
    });
  });

  it("returns null for empty code", () => {
    expect(mapMethodFailure({ code: "", description: "Test" })).toBeNull();
  });
});

describe("mapOperation", () => {
  it("maps VFP operation record", () => {
    const result = mapOperation({
      code: "BLAST     ",
      name: "Grit Blast        ",
      description: "Surface prep      ",
    });
    expect(result).toEqual({
      code: "BLAST",
      name: "Grit Blast",
      description: "Surface prep",
    });
  });

  it("returns null for empty code", () => {
    expect(mapOperation({ code: "   ", name: "Test" })).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/vfp/mappers/reference-data.test.ts`
Expected: FAIL — module not found

**Step 3: Implement the mappers**

```typescript
// scripts/vfp/mappers/reference-data.ts
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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/vfp/mappers/reference-data.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/vfp/mappers/reference-data.ts scripts/vfp/mappers/reference-data.test.ts
git commit -m "feat: add VFP reference data mappers (coating/method failures, operations)"
```

---

### Task 8: Migration orchestrator script

**Files:**
- Create: `scripts/migrate-vfp.ts`

**Step 1: Write the orchestrator**

This script wires together the reader and mappers, inserts into PostgreSQL via Prisma, and logs progress. It's a one-time script — not unit tested (verified by running against real DBF files).

```typescript
// scripts/migrate-vfp.ts
import "dotenv/config";
import path from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { readDbfRecords } from "./vfp/reader";
import { mapCustomer, isActiveCustomer } from "./vfp/mappers/customers";
import { mapContact } from "./vfp/mappers/contacts";
import { mapShipTo } from "./vfp/mappers/ship-to";
import { mapCarrier } from "./vfp/mappers/carriers";
import { mapReference } from "./vfp/mappers/references";
import { mapProduct } from "./vfp/mappers/products";
import { mapTool, mapToolPart } from "./vfp/mappers/tools";
import { mapCoatingFailure, mapMethodFailure, mapOperation } from "./vfp/mappers/reference-data";

const prisma = new PrismaClient();

const VFP_DB = "C:\\Users\\Taylor\\Desktop\\Misc\\From Old PC\\Work\\Impreglon\\FoxPro\\Database";
const VFP_LIBS = path.join(VFP_DB, "Libraries");

const LIBRARY_FILES: Array<{ file: string; type: string }> = [
  { file: "valvelibrary.dbf", type: "ANSI_VALVE" },
  { file: "fittingslibrary.dbf", type: "FITTING" },
  { file: "puplibrary.dbf", type: "PUP_JOINT" },
  { file: "wellvalvelibrary.dbf", type: "WELLHEAD_VALVE" },
  { file: "wellcomponentlibrary.dbf", type: "WELLHEAD_COMPONENT" },
  { file: "accessorylibrary.dbf", type: "ACCESSORY" },
];

async function migrateReferenceData() {
  console.log("\n--- Reference Data ---");

  // Coating failures
  const cfRecords = await readDbfRecords(path.join(VFP_DB, "coatfailure.dbf"));
  let cfCount = 0;
  for (const r of cfRecords) {
    const mapped = mapCoatingFailure(r);
    if (!mapped) continue;
    await prisma.coatingFailure.upsert({
      where: { code: mapped.code },
      update: {},
      create: mapped,
    });
    cfCount++;
  }
  console.log(`  Coating failures: ${cfCount}`);

  // Method failures
  const mfRecords = await readDbfRecords(path.join(VFP_DB, "methodfailure.dbf"));
  let mfCount = 0;
  for (const r of mfRecords) {
    const mapped = mapMethodFailure(r);
    if (!mapped) continue;
    await prisma.methodFailure.upsert({
      where: { code: mapped.code },
      update: {},
      create: mapped,
    });
    mfCount++;
  }
  console.log(`  Method failures: ${mfCount}`);

  // Operations
  const opRecords = await readDbfRecords(path.join(VFP_DB, "OPERATIONS.DBF"));
  let opCount = 0;
  for (const r of opRecords) {
    const mapped = mapOperation(r);
    if (!mapped) continue;
    await prisma.operation.upsert({
      where: { code: mapped.code },
      update: {},
      create: mapped,
    });
    opCount++;
  }
  console.log(`  Operations: ${opCount}`);
}

async function migrateCustomers() {
  console.log("\n--- Customers (active only) ---");
  const records = await readDbfRecords(path.join(VFP_DB, "customers.dbf"));
  let count = 0;
  let skipped = 0;

  for (const r of records) {
    if (!isActiveCustomer(r)) {
      skipped++;
      continue;
    }
    const mapped = mapCustomer(r);
    if (!mapped) { skipped++; continue; }
    await prisma.customer.upsert({
      where: { custNo: mapped.custNo },
      update: {},
      create: mapped,
    });
    count++;
  }
  console.log(`  Customers imported: ${count}, skipped: ${skipped}`);
}

async function migrateContacts() {
  console.log("\n--- Customer Contacts ---");
  const records = await readDbfRecords(path.join(VFP_DB, "CUSTOMERCONTACTS.DBF"));
  let count = 0;
  let skipped = 0;

  for (const r of records) {
    const mapped = mapContact(r);
    if (!mapped) { skipped++; continue; }

    // Find the parent customer
    const customer = await prisma.customer.findUnique({
      where: { custNo: mapped.custNo },
    });
    if (!customer) { skipped++; continue; }

    await prisma.customerContact.create({
      data: {
        customerId: customer.id,
        name: mapped.name,
        title: mapped.title,
        phone: mapped.phone,
        email: mapped.email,
        department: mapped.department,
        isPrimary: mapped.isPrimary,
      },
    });
    count++;
  }
  console.log(`  Contacts imported: ${count}, skipped: ${skipped}`);
}

async function migrateShipTo() {
  console.log("\n--- Ship-To Addresses ---");
  const records = await readDbfRecords(path.join(VFP_DB, "SHIPPING.DBF"));
  let count = 0;
  let skipped = 0;

  for (const r of records) {
    const mapped = mapShipTo(r);
    if (!mapped) { skipped++; continue; }

    const customer = await prisma.customer.findUnique({
      where: { custNo: mapped.custNo },
    });
    if (!customer) { skipped++; continue; }

    await prisma.shipToAddress.create({
      data: {
        customerId: customer.id,
        name: mapped.name,
        address1: mapped.address1,
        address2: mapped.address2,
        city: mapped.city,
        province: mapped.province,
        postalCode: mapped.postalCode,
        isDefault: mapped.isDefault,
      },
    });
    count++;
  }
  console.log(`  Ship-to addresses imported: ${count}, skipped: ${skipped}`);
}

async function migrateCarriers() {
  console.log("\n--- Carriers ---");
  const records = await readDbfRecords(path.join(VFP_DB, "CARRIERS.DBF"));
  let count = 0;
  let skipped = 0;

  for (const r of records) {
    const mapped = mapCarrier(r);
    if (!mapped) { skipped++; continue; }

    const customer = await prisma.customer.findUnique({
      where: { custNo: mapped.custNo },
    });
    if (!customer) { skipped++; continue; }

    await prisma.carrier.create({
      data: {
        customerId: customer.id,
        name: mapped.name,
        account: mapped.account,
        phone: mapped.phone,
        isDefault: mapped.isDefault,
      },
    });
    count++;
  }
  console.log(`  Carriers imported: ${count}, skipped: ${skipped}`);
}

async function migrateReferences() {
  console.log("\n--- Customer References ---");
  const records = await readDbfRecords(path.join(VFP_DB, "CUST_REFERENCES.DBF"));
  let count = 0;
  let skipped = 0;

  for (const r of records) {
    const mapped = mapReference(r);
    if (!mapped) { skipped++; continue; }

    const customer = await prisma.customer.findUnique({
      where: { custNo: mapped.custNo },
    });
    if (!customer) { skipped++; continue; }

    await prisma.customerReference.create({
      data: {
        customerId: customer.id,
        reference: mapped.reference,
      },
    });
    count++;
  }
  console.log(`  References imported: ${count}, skipped: ${skipped}`);
}

async function migrateProducts() {
  console.log("\n--- Product Libraries ---");

  for (const { file, type } of LIBRARY_FILES) {
    const filePath = path.join(VFP_LIBS, file);
    let records: Awaited<ReturnType<typeof readDbfRecords>>;
    try {
      records = await readDbfRecords(filePath);
    } catch (err) {
      console.log(`  ${type}: SKIPPED (file not found: ${file})`);
      continue;
    }

    let count = 0;
    let skipped = 0;

    for (const r of records) {
      const mapped = mapProduct(r, type);
      if (!mapped) { skipped++; continue; }

      await prisma.productLibraryItem.upsert({
        where: {
          libraryType_catalogSource_libraryNo: {
            libraryType: mapped.libraryType as any,
            catalogSource: mapped.catalogSource ?? "",
            libraryNo: mapped.libraryNo,
          },
        },
        update: {},
        create: mapped as any,
      });
      count++;
    }
    console.log(`  ${type}: ${count} imported, ${skipped} skipped`);
  }
}

async function migrateTools() {
  console.log("\n--- Tools ---");
  const records = await readDbfRecords(path.join(VFP_DB, "tools.dbf"));
  let count = 0;
  let skipped = 0;

  for (const r of records) {
    const mapped = mapTool(r);
    if (!mapped) { skipped++; continue; }

    await prisma.tool.upsert({
      where: { toolNo: mapped.toolNo },
      update: {},
      create: mapped as any,
    });
    count++;
  }
  console.log(`  Tools imported: ${count}, skipped: ${skipped}`);

  // Tool parts
  console.log("\n--- Tool Parts ---");
  const partRecords = await readDbfRecords(path.join(VFP_DB, "PARTS.DBF"));
  let partCount = 0;
  let partSkipped = 0;

  for (const r of partRecords) {
    const mapped = mapToolPart(r);
    if (!mapped) { partSkipped++; continue; }

    const tool = await prisma.tool.findUnique({
      where: { toolNo: mapped.toolNo },
    });
    if (!tool) { partSkipped++; continue; }

    await prisma.toolPart.create({
      data: {
        toolId: tool.id,
        partNo: mapped.partNo,
        description: mapped.description,
        price: mapped.price,
        quantity: mapped.quantity,
      },
    });
    partCount++;
  }
  console.log(`  Tool parts imported: ${partCount}, skipped: ${partSkipped}`);
}

async function main() {
  console.log("=== VFP Data Migration ===");
  console.log(`Source: ${VFP_DB}`);
  console.log(`Started: ${new Date().toISOString()}`);

  await migrateReferenceData();
  await migrateCustomers();
  await migrateContacts();
  await migrateShipTo();
  await migrateCarriers();
  await migrateReferences();
  await migrateProducts();
  await migrateTools();

  console.log("\n=== Migration Complete ===");
  console.log(`Finished: ${new Date().toISOString()}`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

**Step 2: Verify build**

Run: `npx vitest run scripts/`
Expected: All mapper tests still pass

**Step 3: Commit**

```bash
git add scripts/migrate-vfp.ts
git commit -m "feat: add VFP migration orchestrator script"
```

---

### Task 9: Add npm script + final verification

**Files:**
- Modify: `package.json` (add migrate:vfp script)

**Step 1: Add npm script to package.json**

Add to `"scripts"` section:
```json
"migrate:vfp": "npx tsx scripts/migrate-vfp.ts"
```

**Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (existing 749 + new mapper tests)

**Step 3: Verify build**

Run: `npx next build`
Expected: Build passes

**Step 4: Commit**

```bash
git add package.json
git commit -m "feat: add migrate:vfp npm script"
```

---

## Key Files

- `prisma/schema.prisma` (modify — add coatingPrice9-14)
- `scripts/vfp/reader.ts` (new)
- `scripts/vfp/reader.test.ts` (new)
- `scripts/vfp/mappers/customers.ts` (new)
- `scripts/vfp/mappers/customers.test.ts` (new)
- `scripts/vfp/mappers/contacts.ts` (new)
- `scripts/vfp/mappers/contacts.test.ts` (new)
- `scripts/vfp/mappers/ship-to.ts` (new)
- `scripts/vfp/mappers/ship-to.test.ts` (new)
- `scripts/vfp/mappers/carriers.ts` (new)
- `scripts/vfp/mappers/carriers.test.ts` (new)
- `scripts/vfp/mappers/references.ts` (new)
- `scripts/vfp/mappers/references.test.ts` (new)
- `scripts/vfp/mappers/products.ts` (new)
- `scripts/vfp/mappers/products.test.ts` (new)
- `scripts/vfp/mappers/tools.ts` (new)
- `scripts/vfp/mappers/tools.test.ts` (new)
- `scripts/vfp/mappers/reference-data.ts` (new)
- `scripts/vfp/mappers/reference-data.test.ts` (new)
- `scripts/migrate-vfp.ts` (new)
- `package.json` (modify — add dbffile + npm script)

## Verification

- `npx vitest run` — all tests pass
- `npx next build` — build passes
- `npm run migrate:vfp` — migration runs successfully against real VFP files (manual step post-merge)
