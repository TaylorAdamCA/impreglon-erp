import { describe, it, expect } from "vitest";
import { mapCustomer, isActiveCustomer } from "./customers";

describe("mapCustomer", () => {
  const validRecord = {
    custno: 101,
    company: "Acme Oil Ltd          ",
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
    expect(result?.company).toBe("Acme Oil Ltd");
    expect(result?.city).toBe("Calgary");
  });

  it("converts empty strings to null", () => {
    const record = { ...validRecord, address2: "          ", fax: "" };
    const result = mapCustomer(record);
    expect(result?.address2).toBeNull();
    expect(result?.fax).toBeNull();
  });

  it("returns null for records with custno 0", () => {
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
