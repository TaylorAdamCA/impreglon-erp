import { describe, it, expect } from "vitest";
import { mapCustomer, isActiveCustomer } from "./customers";

describe("mapCustomer", () => {
  const validRecord = {
    CUSTNO: "GUIBE    ",
    NAME: "Guiberson Ltd                           ",
    ADDRESS: "123 Main St                   ",
    ADDRESS2: "                              ",
    CITY: "Calgary        ",
    PROVINCE: "AB             ",
    POSTALCODE: "T2P1J9 ",
    PHONENO: "403-555-1234  ",
    FAXNO: "403-555-1235  ",
    EMAIL_ADD: "info@guiberson.com                                ",
    CUSTMEMO: "Good customer",
    ACTIVE: true,
  };

  it("maps VFP customer record with string custCode", () => {
    const result = mapCustomer(validRecord);
    expect(result).toEqual({
      custCode: "GUIBE",
      company: "Guiberson Ltd",
      address1: "123 Main St",
      address2: null,
      city: "Calgary",
      province: "AB",
      postalCode: "T2P1J9",
      phone: "403-555-1234",
      fax: "403-555-1235",
      email: "info@guiberson.com",
      terms: null,
      notes: "Good customer",
      isActive: true,
    });
  });

  it("trims VFP character field padding", () => {
    const result = mapCustomer(validRecord);
    expect(result?.custCode).toBe("GUIBE");
    expect(result?.company).toBe("Guiberson Ltd");
    expect(result?.city).toBe("Calgary");
  });

  it("converts empty strings to null", () => {
    const record = { ...validRecord, ADDRESS2: "          ", FAXNO: "" };
    const result = mapCustomer(record);
    expect(result?.address2).toBeNull();
    expect(result?.fax).toBeNull();
  });

  it("returns null for records with empty CUSTNO", () => {
    const record = { ...validRecord, CUSTNO: "         " };
    const result = mapCustomer(record);
    expect(result).toBeNull();
  });
});

describe("isActiveCustomer", () => {
  it("returns true for active non-deleted records", () => {
    expect(
      isActiveCustomer({ CUSTNO: "GUIBE", ACTIVE: true, _deleted: false })
    ).toBe(true);
  });

  it("returns false for deleted records", () => {
    expect(
      isActiveCustomer({ CUSTNO: "GUIBE", ACTIVE: true, _deleted: true })
    ).toBe(false);
  });

  it("returns false for inactive records", () => {
    expect(isActiveCustomer({ CUSTNO: "GUIBE", ACTIVE: false })).toBe(false);
  });

  it("returns false for records with empty CUSTNO", () => {
    expect(isActiveCustomer({ CUSTNO: "         " })).toBe(false);
  });
});
