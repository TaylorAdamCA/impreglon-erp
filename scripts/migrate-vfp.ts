import "dotenv/config";
import path from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import type {
  ProductLibraryType,
  ToolStatus,
} from "../src/generated/prisma/client";
import { readDbfRecords } from "./vfp/reader";
import { mapCustomer, isActiveCustomer } from "./vfp/mappers/customers";
import { mapContact } from "./vfp/mappers/contacts";
import { mapShipTo } from "./vfp/mappers/ship-to";
import { mapCarrier } from "./vfp/mappers/carriers";
import { mapReference } from "./vfp/mappers/references";
import { mapProduct } from "./vfp/mappers/products";
import { mapTool, mapToolPart } from "./vfp/mappers/tools";
import {
  mapCoatingFailure,
  mapMethodFailure,
  mapOperation,
} from "./vfp/mappers/reference-data";

const VFP_DIR = String.raw`C:\Users\Taylor\Desktop\Misc\From Old PC\Work\Impreglon\FoxPro\Database`;
const LIBRARIES_DIR = path.join(VFP_DIR, "Libraries");

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dbf(dir: string, filename: string): string {
  return path.join(dir, filename);
}

// ---------------------------------------------------------------------------
// 1. Reference data — no dependencies
// ---------------------------------------------------------------------------

async function migrateCoatingFailures() {
  console.log("\n--- Coating Failures ---");
  const records = await readDbfRecords(dbf(VFP_DIR, "coatfailure.dbf"));
  let imported = 0;
  let skipped = 0;

  for (const record of records) {
    const mapped = mapCoatingFailure(record);
    if (!mapped) {
      skipped++;
      continue;
    }
    await prisma.coatingFailure.upsert({
      where: { code: mapped.code },
      update: {},
      create: mapped,
    });
    imported++;
  }

  console.log(`  Coating Failures: ${imported} imported, ${skipped} skipped`);
}

async function migrateMethodFailures() {
  console.log("\n--- Method Failures ---");
  const records = await readDbfRecords(dbf(VFP_DIR, "methodfailure.dbf"));
  let imported = 0;
  let skipped = 0;

  for (const record of records) {
    const mapped = mapMethodFailure(record);
    if (!mapped) {
      skipped++;
      continue;
    }
    await prisma.methodFailure.upsert({
      where: { code: mapped.code },
      update: {},
      create: mapped,
    });
    imported++;
  }

  console.log(`  Method Failures: ${imported} imported, ${skipped} skipped`);
}

async function migrateOperations() {
  console.log("\n--- Operations ---");
  const records = await readDbfRecords(dbf(VFP_DIR, "OPERATIONS.DBF"));
  let imported = 0;
  let skipped = 0;

  for (const record of records) {
    const mapped = mapOperation(record);
    if (!mapped) {
      skipped++;
      continue;
    }
    await prisma.operation.upsert({
      where: { code: mapped.code },
      update: {},
      create: mapped,
    });
    imported++;
  }

  console.log(`  Operations: ${imported} imported, ${skipped} skipped`);
}

// ---------------------------------------------------------------------------
// 2. Customers (active only)
// ---------------------------------------------------------------------------

async function migrateCustomers() {
  console.log("\n--- Customers ---");
  const records = await readDbfRecords(dbf(VFP_DIR, "customers.dbf"));
  let imported = 0;
  let skipped = 0;

  for (const record of records) {
    if (!isActiveCustomer(record)) {
      skipped++;
      continue;
    }
    const mapped = mapCustomer(record);
    if (!mapped) {
      skipped++;
      continue;
    }
    await prisma.customer.upsert({
      where: { custNo: mapped.custNo },
      update: {},
      create: mapped,
    });
    imported++;
  }

  console.log(`  Customers: ${imported} imported, ${skipped} skipped`);
}

// ---------------------------------------------------------------------------
// 3. Contacts — link to customers via custNo lookup
// ---------------------------------------------------------------------------

async function migrateContacts() {
  console.log("\n--- Contacts ---");
  const records = await readDbfRecords(dbf(VFP_DIR, "CUSTOMERCONTACTS.DBF"));
  let imported = 0;
  let skipped = 0;

  for (const record of records) {
    const mapped = mapContact(record);
    if (!mapped) {
      skipped++;
      continue;
    }

    const customer = await prisma.customer.findUnique({
      where: { custNo: mapped.custNo },
    });
    if (!customer) {
      skipped++;
      continue;
    }

    const { custNo, ...contactData } = mapped;
    await prisma.customerContact.create({
      data: { customerId: customer.id, ...contactData },
    });
    imported++;
  }

  console.log(`  Contacts: ${imported} imported, ${skipped} skipped`);
}

// ---------------------------------------------------------------------------
// 4. Ship-to addresses — link to customers via custNo lookup
// ---------------------------------------------------------------------------

async function migrateShipToAddresses() {
  console.log("\n--- Ship-To Addresses ---");
  const records = await readDbfRecords(dbf(VFP_DIR, "SHIPPING.DBF"));
  let imported = 0;
  let skipped = 0;

  for (const record of records) {
    const mapped = mapShipTo(record);
    if (!mapped) {
      skipped++;
      continue;
    }

    const customer = await prisma.customer.findUnique({
      where: { custNo: mapped.custNo },
    });
    if (!customer) {
      skipped++;
      continue;
    }

    const { custNo, ...shipToData } = mapped;
    await prisma.shipToAddress.create({
      data: {
        customerId: customer.id,
        ...shipToData,
        address1: shipToData.address1 ?? "",
        city: shipToData.city ?? "",
      },
    });
    imported++;
  }

  console.log(`  Ship-To Addresses: ${imported} imported, ${skipped} skipped`);
}

// ---------------------------------------------------------------------------
// 5. Carriers — link to customers via custNo lookup
// ---------------------------------------------------------------------------

async function migrateCarriers() {
  console.log("\n--- Carriers ---");
  const records = await readDbfRecords(dbf(VFP_DIR, "CARRIERS.DBF"));
  let imported = 0;
  let skipped = 0;

  for (const record of records) {
    const mapped = mapCarrier(record);
    if (!mapped) {
      skipped++;
      continue;
    }

    const customer = await prisma.customer.findUnique({
      where: { custNo: mapped.custNo },
    });
    if (!customer) {
      skipped++;
      continue;
    }

    const { custNo, ...carrierData } = mapped;
    await prisma.carrier.create({
      data: { customerId: customer.id, ...carrierData },
    });
    imported++;
  }

  console.log(`  Carriers: ${imported} imported, ${skipped} skipped`);
}

// ---------------------------------------------------------------------------
// 6. Customer references — link to customers via custNo lookup
// ---------------------------------------------------------------------------

async function migrateReferences() {
  console.log("\n--- Customer References ---");
  const records = await readDbfRecords(dbf(VFP_DIR, "CUST_REFERENCES.DBF"));
  let imported = 0;
  let skipped = 0;

  for (const record of records) {
    const mapped = mapReference(record);
    if (!mapped) {
      skipped++;
      continue;
    }

    const customer = await prisma.customer.findUnique({
      where: { custNo: mapped.custNo },
    });
    if (!customer) {
      skipped++;
      continue;
    }

    const { custNo, ...refData } = mapped;
    await prisma.customerReference.create({
      data: { customerId: customer.id, ...refData },
    });
    imported++;
  }

  console.log(
    `  Customer References: ${imported} imported, ${skipped} skipped`
  );
}

// ---------------------------------------------------------------------------
// 7. Product libraries — 6 files, each maps to a ProductLibraryType
// ---------------------------------------------------------------------------

const PRODUCT_LIBRARY_FILES: Array<{ file: string; type: string }> = [
  { file: "valvelibrary.dbf", type: "ANSI_VALVE" },
  { file: "fittingslibrary.dbf", type: "FITTING" },
  { file: "puplibrary.dbf", type: "PUP_JOINT" },
  { file: "wellvalvelibrary.dbf", type: "WELLHEAD_VALVE" },
  { file: "wellcomponentlibrary.dbf", type: "WELLHEAD_COMPONENT" },
  { file: "accessorylibrary.dbf", type: "ACCESSORY" },
];

async function migrateProductLibraries() {
  console.log("\n--- Product Libraries ---");

  for (const { file, type } of PRODUCT_LIBRARY_FILES) {
    let records;
    try {
      records = await readDbfRecords(dbf(LIBRARIES_DIR, file));
    } catch {
      console.log(`  ${type}: SKIPPED (${file} not found)`);
      continue;
    }

    let imported = 0;
    let skipped = 0;

    for (const record of records) {
      const mapped = mapProduct(record, type);
      if (!mapped) {
        skipped++;
        continue;
      }

      await prisma.productLibraryItem.upsert({
        where: {
          libraryType_catalogSource_libraryNo: {
            libraryType: mapped.libraryType as ProductLibraryType,
            catalogSource: mapped.catalogSource ?? "",
            libraryNo: mapped.libraryNo,
          },
        },
        update: {},
        create: mapped as any,
      });
      imported++;
    }

    console.log(`  ${type}: ${imported} imported, ${skipped} skipped`);
  }
}

// ---------------------------------------------------------------------------
// 8. Tools
// ---------------------------------------------------------------------------

async function migrateTools() {
  console.log("\n--- Tools ---");
  const records = await readDbfRecords(dbf(VFP_DIR, "tools.dbf"));
  let imported = 0;
  let skipped = 0;

  for (const record of records) {
    const mapped = mapTool(record);
    if (!mapped) {
      skipped++;
      continue;
    }

    await prisma.tool.upsert({
      where: { toolNo: mapped.toolNo },
      update: {},
      create: { ...mapped, status: mapped.status as ToolStatus },
    });
    imported++;
  }

  console.log(`  Tools: ${imported} imported, ${skipped} skipped`);
}

// ---------------------------------------------------------------------------
// 9. Tool parts — link to tools via toolNo lookup
// ---------------------------------------------------------------------------

async function migrateToolParts() {
  console.log("\n--- Tool Parts ---");
  const records = await readDbfRecords(dbf(VFP_DIR, "PARTS.DBF"));
  let imported = 0;
  let skipped = 0;

  for (const record of records) {
    const mapped = mapToolPart(record);
    if (!mapped) {
      skipped++;
      continue;
    }

    const tool = await prisma.tool.findUnique({
      where: { toolNo: mapped.toolNo },
    });
    if (!tool) {
      skipped++;
      continue;
    }

    const { toolNo, ...partData } = mapped;
    await prisma.toolPart.create({
      data: { toolId: tool.id, ...partData },
    });
    imported++;
  }

  console.log(`  Tool Parts: ${imported} imported, ${skipped} skipped`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== VFP Data Migration ===");
  console.log(`Source: ${VFP_DIR}`);
  console.log(`Libraries: ${LIBRARIES_DIR}`);

  // 1. Reference data (no dependencies)
  await migrateCoatingFailures();
  await migrateMethodFailures();
  await migrateOperations();

  // 2. Customers (active only)
  await migrateCustomers();

  // 3-6. Customer child entities
  await migrateContacts();
  await migrateShipToAddresses();
  await migrateCarriers();
  await migrateReferences();

  // 7. Product libraries
  await migrateProductLibraries();

  // 8-9. Tools and tool parts
  await migrateTools();
  await migrateToolParts();

  console.log("\n=== Migration Complete ===");
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
