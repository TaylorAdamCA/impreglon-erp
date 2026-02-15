import { describe, it, expect } from "vitest";
import { mapContact } from "./contacts";

describe("mapContact", () => {
  it("maps VFP contact record with uppercase fields", () => {
    const result = mapContact({
      CUSTNO: "GUIBE    ",
      ATTENTION: "John Smith                    ",
      EMAIL: "john@guiberson.com                      ",
      PHONE: "403-555-9999  ",
      FAX: "403-555-9998  ",
      HOMEOFFICE: "Calgary Office      ",
    });
    expect(result).toEqual({
      custCode: "GUIBE",
      name: "John Smith",
      title: null,
      phone: "403-555-9999",
      email: "john@guiberson.com",
      department: "Calgary Office",
      isPrimary: false,
    });
  });

  it("returns null for records with empty CUSTNO", () => {
    expect(mapContact({ CUSTNO: "         ", ATTENTION: "Test" })).toBeNull();
  });

  it("returns null for records with empty ATTENTION", () => {
    expect(
      mapContact({ CUSTNO: "GUIBE", ATTENTION: "                              " })
    ).toBeNull();
  });
});
