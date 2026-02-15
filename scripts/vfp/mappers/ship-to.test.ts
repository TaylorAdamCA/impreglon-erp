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
