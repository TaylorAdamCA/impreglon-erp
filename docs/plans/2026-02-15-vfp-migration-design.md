# VFP Data Migration Design

## Goal

Migrate reference and master data from VFP DBF tables into the PostgreSQL database using a one-time migration script.

## Scope

**In scope:**
- Reference data: carriers, failure codes, operations
- Master data: active customers, contacts, all 6 product libraries (main valvelibrary only), tools

**Out of scope (backlogged):**
- Historical transactions (orders, quotes, shipping, rework, month-end)
- Inactive/old customers (compliance backlog)
- Numbered valve library backups (valvelibrary1, valvelibrary2)
- API endpoint for re-running migration

## Approach

One-time migration script using the `dbffile` npm package to read VFP `.dbf` files. Run via `npx tsx scripts/migrate-vfp.ts`. Idempotent (safe to re-run) using upserts keyed on VFP primary keys.

## Script Structure

```
scripts/
  migrate-vfp.ts          # Main entry point - orchestrates migration
  vfp/
    reader.ts             # Thin wrapper around dbffile for reading DBFs
    mappers/
      customers.ts        # VFP customer → Prisma Customer
      contacts.ts         # VFP contacts → Prisma Contact
      products.ts         # VFP library → Prisma Product (all 6 libraries)
      tools.ts            # VFP tools → Prisma Tool
      reference.ts        # Carriers, failure codes, operations
```

## Migration Order

1. Reference data (carriers, failure codes, operations) — no dependencies
2. Customers (active only, filtered on VFP `active` flag)
3. Contacts (references customers via custno)
4. Product libraries (all 6 files → Product model with libraryType enum)
5. Tools

## VFP Source Files

| VFP Table | Path | Target Model |
|-----------|------|-------------|
| `CARRIERS.DBF` | Database/ | Carrier |
| `coatfailure.dbf` | Database/ | Seed data |
| `methodfailure.dbf` | Database/ | Seed data |
| `OPERATIONS.DBF` | Database/ | Seed data |
| `customers.dbf` | Database/ | Customer |
| `CUSTOMERCONTACTS.DBF` | Database/ | Contact |
| `valvelibrary.dbf` | Database/Libraries/ | Product (VALVE) |
| `fittingslibrary.dbf` | Database/Libraries/ | Product (FITTING) |
| `puplibrary.dbf` | Database/Libraries/ | Product (PUP) |
| `wellvalvelibrary.dbf` | Database/Libraries/ | Product (WELL_VALVE) |
| `wellcomponentlibrary.dbf` | Database/Libraries/ | Product (WELL_COMPONENT) |
| `accessorylibrary.dbf` | Database/Libraries/ | Product (ACCESSORY) |
| `tools.dbf` | Database/ | Tool |

## Data Mapping

**Customers** — Filter `active = .T.`. VFP `custno` → `custNo`, `company` → `name`, `address1`/`address2`/`city`/`prov`/`postal` → address fields, `phone`/`fax`/`email` → contact fields.

**Product Libraries** — All 6 share similar structure. VFP `partno` → `partNo`, `libraryno` → `libraryNo`, `desc1` → `description`, `bore` → `bore`, `pieces` → `pieces`, `price1`–`price14` → `coatingPrice1`–`coatingPrice14`. `libraryType` set per source file.

**Contacts** — VFP `custno` links to Customer. Maps name, phone, email, title fields.

**Tools** — Direct field mapping to Tool model.

**Skip rules:**
- Records with partno/custno = 0 (empty rows)
- VFP nulls preserved as schema defaults
- VFP dates converted to JS Date objects

## Idempotency

Uses upsert keyed on VFP primary keys (custNo, partNo) so the script can be safely re-run without creating duplicates.
