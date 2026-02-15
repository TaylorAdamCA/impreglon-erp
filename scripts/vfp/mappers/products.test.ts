import { describe, it, expect } from "vitest";
import { mapProduct } from "./products";

describe("mapProduct", () => {
  const valveRecord = {
    PARTNO: 593,
    LIBRARYNO: 2,
    DESC1: "Globe/Control Valve   ",
    BORE: '8" 600#               ',
    PIECES: 1,
    TYPENO: 7,
    PRICE1: 809.01,
    PRICE2: 0.0,
    PRICE3: 1555.26,
    PRICE4: 0.0,
    PRICE5: 889.92,
    PRICE6: 0.0,
    PRICE7: 348.5,
    PRICE8: 348.5,
    PRICE9: 585.0,
    PRICE10: 585.0,
    PRICE11: 453.05,
    PRICE12: 453.05,
    PRICE13: 760.5,
    PRICE14: 760.5,
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
      coatingPrice7: 348.5,
      coatingPrice8: 348.5,
      coatingPrice9: 585.0,
      coatingPrice10: 585.0,
      coatingPrice11: 453.05,
      coatingPrice12: 453.05,
      coatingPrice13: 760.5,
      coatingPrice14: 760.5,
      isActive: true,
    });
  });

  it("maps a fitting record", () => {
    const fittingRecord = {
      PARTNO: 100,
      LIBRARYNO: 1,
      DESC1: "2-inch Elbow    ",
      BORE: '2"    ',
      PIECES: 1,
      TYPENO: 3,
      PRICE1: 50.0,
      PRICE2: 75.0,
      PRICE3: 55.0,
    };
    const result = mapProduct(fittingRecord, "FITTING");
    expect(result?.libraryType).toBe("FITTING");
    expect(result?.libraryNo).toBe(100);
    expect(result?.coatingPrice1).toBe(50.0);
    expect(result?.coatingPrice3).toBe(55.0);
  });

  it("returns null for records with PARTNO 0", () => {
    const result = mapProduct({ ...valveRecord, PARTNO: 0 }, "ANSI_VALVE");
    expect(result).toBeNull();
  });

  it("returns null for records with empty description", () => {
    const result = mapProduct(
      { ...valveRecord, DESC1: "      " },
      "ANSI_VALVE"
    );
    expect(result).toBeNull();
  });

  it("treats missing price fields as null", () => {
    const sparseRecord = {
      PARTNO: 200,
      DESC1: "Simple Item   ",
      BORE: "",
      TYPENO: 1,
      PRICE1: 100.0,
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

  it("maps accessory single PRICE to coatingPrice1", () => {
    const accessoryRecord = {
      PARTNO: 10,
      DESC1: "O-Ring Kit    ",
      BORE: '4"    ',
      PRICE: 25.5,
    };
    const result = mapProduct(accessoryRecord, "ACCESSORY");
    expect(result?.coatingPrice1).toBe(25.5);
  });
});
