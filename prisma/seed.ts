import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create permissions
  const permissionCodes = [
    { code: "create", description: "Create orders", category: "orders" },
    { code: "mod_rec_ord", description: "Modify received orders", category: "orders" },
    { code: "mod_ip_ord", description: "Modify in-progress orders", category: "orders" },
    { code: "mod_fin_ord", description: "Modify finalized orders", category: "orders" },
    { code: "del_ord", description: "Delete orders", category: "orders" },
    { code: "browse_ord", description: "Browse orders", category: "orders" },
    { code: "reset_ord", description: "Reset order status", category: "orders" },
    { code: "w_i_p", description: "Work in progress", category: "orders" },
    { code: "receive", description: "Receive components", category: "manufacturing" },
    { code: "quality", description: "QA inspection", category: "manufacturing" },
    { code: "complete", description: "Mark orders complete", category: "manufacturing" },
    { code: "shipping", description: "Shipping operations", category: "manufacturing" },
    { code: "sub_contract", description: "Subcontract management", category: "manufacturing" },
    { code: "p_plan", description: "Process plan", category: "manufacturing" },
    { code: "draft", description: "Draft invoices", category: "financial" },
    { code: "approval", description: "Approve invoices", category: "financial" },
    { code: "mod_invoice", description: "Modify invoices", category: "financial" },
    { code: "final", description: "Finalize invoices", category: "financial" },
    { code: "accounting", description: "Accounting screens", category: "financial" },
    { code: "invoice_draft", description: "Create draft invoices", category: "financial" },
    { code: "invoice_modify", description: "Modify invoices", category: "financial" },
    { code: "invoice_approve", description: "Approve invoices", category: "financial" },
    { code: "invoice_finalize", description: "Finalize invoices", category: "financial" },
    { code: "invoice_view", description: "View invoices", category: "financial" },
    { code: "monthend", description: "Month-end processing", category: "financial" },
    { code: "sales_journal", description: "Sales journal", category: "financial" },
    { code: "prop_tools", description: "Proprietary tools", category: "tools" },
    { code: "create_tool", description: "Create tools", category: "tools" },
    { code: "mod_tool", description: "Modify tools", category: "tools" },
    { code: "tool_rec_rpt", description: "Tool receipt report", category: "tools" },
    { code: "tool_create", description: "Create tools", category: "tools" },
    { code: "tool_modify", description: "Modify tools and assignments", category: "tools" },
    { code: "tool_view", description: "View tools", category: "tools" },
    { code: "tool_receive", description: "Receive tools", category: "tools" },
    { code: "cust_maint", description: "Customer maintenance", category: "customers" },
    { code: "contact_maint", description: "Contact maintenance", category: "customers" },
    { code: "cust_list", description: "Customer list", category: "customers" },
    { code: "browse_cust", description: "Browse customers", category: "customers" },
    { code: "email_cust", description: "Email customers", category: "customers" },
    { code: "update_lib", description: "Update libraries", category: "libraries" },
    { code: "price_lists", description: "Price lists", category: "libraries" },
    { code: "log_on", description: "User administration", category: "admin" },
    { code: "coattype_rpt", description: "Coating type reports", category: "admin" },
    { code: "cust_sales", description: "Customer sales reports", category: "admin" },
    { code: "batch_rpts", description: "Batch reports", category: "admin" },
  ];

  const permissions = [];
  for (const p of permissionCodes) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
    permissions.push(perm);
  }

  console.log(`Seeded ${permissions.length} permissions`);

  // Create admin role with all permissions
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {
      permissions: { set: permissions.map((p) => ({ id: p.id })) },
    },
    create: {
      name: "ADMIN",
      description: "Full system access",
      permissions: { connect: permissions.map((p) => ({ id: p.id })) },
    },
  });

  // Create office role with office-level permissions
  const officePerms = permissions.filter((p) =>
    ["orders", "customers", "libraries", "financial"].includes(p.category)
  );
  await prisma.role.upsert({
    where: { name: "OFFICE" },
    update: {
      permissions: { set: officePerms.map((p) => ({ id: p.id })) },
    },
    create: {
      name: "OFFICE",
      description: "Office staff access",
      permissions: { connect: officePerms.map((p) => ({ id: p.id })) },
    },
  });

  // Create shop role with shop-level permissions
  const shopPerms = permissions.filter((p) => p.category === "manufacturing");
  await prisma.role.upsert({
    where: { name: "SHOP" },
    update: {
      permissions: { set: shopPerms.map((p) => ({ id: p.id })) },
    },
    create: {
      name: "SHOP",
      description: "Shop floor access",
      permissions: { connect: shopPerms.map((p) => ({ id: p.id })) },
    },
  });

  console.log("Seeded roles: ADMIN, OFFICE, SHOP");

  // Create admin user
  const passwordHash = await hash("admin", 12);
  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  console.log('Seeded admin user (username: "admin", password: "admin")');

  // Seed Canadian statutory holidays
  const existingHolidays = await prisma.holiday.count();
  if (existingHolidays === 0) {
    await prisma.holiday.createMany({
      data: [
        { name: "New Year's Day", month: 1, day: 1, dayOfWeek: null, occurrence: null, holidayType: "FIXED" },
        { name: "Family Day", month: 2, day: null, dayOfWeek: 2, occurrence: 3, holidayType: "FLOATING" },
        { name: "Good Friday 2026", month: 4, day: 3, dayOfWeek: null, occurrence: null, holidayType: "EASTER" },
        { name: "Victoria Day", month: 5, day: null, dayOfWeek: 2, occurrence: 3, holidayType: "FLOATING" },
        { name: "Canada Day", month: 7, day: 1, dayOfWeek: null, occurrence: null, holidayType: "FIXED" },
        { name: "Labour Day", month: 9, day: null, dayOfWeek: 2, occurrence: 1, holidayType: "FLOATING" },
        { name: "Thanksgiving", month: 10, day: null, dayOfWeek: 2, occurrence: 2, holidayType: "FLOATING" },
        { name: "Remembrance Day", month: 11, day: 11, dayOfWeek: null, occurrence: null, holidayType: "FIXED" },
        { name: "Christmas Day", month: 12, day: 25, dayOfWeek: null, occurrence: null, holidayType: "FIXED" },
        { name: "Boxing Day", month: 12, day: 26, dayOfWeek: null, occurrence: null, holidayType: "FIXED" },
      ],
    });
    console.log("Seeded 10 Canadian statutory holidays");
  } else {
    console.log(`Skipped holiday seeding (${existingHolidays} already exist)`);
  }

  // Seed GST tax rates (historical)
  const existingTaxRates = await prisma.taxRate.count();
  if (existingTaxRates === 0) {
    await prisma.taxRate.createMany({
      data: [
        { taxId: "GST", effectiveDate: new Date("2000-01-01"), expiryDate: new Date("2007-12-31"), rate: 7 },
        { taxId: "GST", effectiveDate: new Date("2008-01-01"), expiryDate: new Date("2099-12-31"), rate: 5 },
      ],
    });
    console.log("Seeded 2 GST tax rates");
  } else {
    console.log(`Skipped tax rate seeding (${existingTaxRates} already exist)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
