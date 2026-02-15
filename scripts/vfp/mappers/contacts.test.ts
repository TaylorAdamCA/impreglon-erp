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
