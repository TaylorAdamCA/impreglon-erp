import { describe, it, expect } from "vitest";
import { mapShipTo } from "./ship-to";

describe("mapShipTo", () => {
  it("maps VFP shipping record with free-form text lines", () => {
    const result = mapShipTo({
      SHIPNO: 1,
      CUSTNO: "GUIBE    ",
      SHIPTO1: "Guiberson Warehouse                ",
      SHIPTO2: "456 Industrial Ave       ",
      SHIPTO3: "Edmonton, AB T5J 1S9     ",
    });
    expect(result).toEqual({
      custCode: "GUIBE",
      name: "Guiberson Warehouse",
      address1: "456 Industrial Ave",
      address2: null,
      city: "Edmonton, AB T5J 1S9",
      province: null,
      postalCode: null,
      isDefault: false,
    });
  });

  it("returns null for records with empty CUSTNO", () => {
    expect(mapShipTo({ CUSTNO: "         ", SHIPTO1: "Test" })).toBeNull();
  });

  it("returns null for records with empty SHIPTO1", () => {
    expect(
      mapShipTo({ CUSTNO: "GUIBE", SHIPTO1: "                                   " })
    ).toBeNull();
  });

  it("uses empty string for missing address and city", () => {
    const result = mapShipTo({
      CUSTNO: "GUIBE",
      SHIPTO1: "Warehouse",
    });
    expect(result?.address1).toBe("");
    expect(result?.city).toBe("");
  });
});
