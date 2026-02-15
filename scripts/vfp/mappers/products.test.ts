import { describe, it, expect } from "vitest";
import { mapProduct } from "./products";

describe("mapProduct", () => {
  const valveRecord = {
    partno: 593,
    libraryno: 2,
    desc1: "Globe/Control Valve   ",
    bore: '8" 600#               ',
    pieces: 1,
    typeno: 7,
    price1: 809.01,
    price2: 0.0,
    price3: 1555.26,
    price4: 0.0,
    price5: 889.92,
    price6: 0.0,
    price7: 348.50,
    price8: 348.50,
    price9: 585.00,
    price10: 585.00,
    price11: 453.05,
    price12: 453.05,
    price13: 760.50,
    price14: 760.50,
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
      coatingPrice7: 348.50,
      coatingPrice8: 348.50,
      coatingPrice9: 585.00,
      coatingPrice10: 585.00,
      coatingPrice11: 453.05,
      coatingPrice12: 453.05,
      coatingPrice13: 760.50,
      coatingPrice14: 760.50,
      isActive: true,
    });
  });

  it("maps a fitting record", () => {
    const fittingRecord = {
      partno: 100,
      libraryno: 1,
      desc1: "2-inch Elbow    ",
      bore: '2"    ',
      pieces: 1,
      typeno: 3,
      price1: 50.0,
      price2: 75.0,
      price3: 55.0,
    };
    const result = mapProduct(fittingRecord, "FITTING");
    expect(result?.libraryType).toBe("FITTING");
    expect(result?.libraryNo).toBe(100);
    expect(result?.coatingPrice1).toBe(50.0);
    expect(result?.coatingPrice3).toBe(55.0);
  });

  it("returns null for records with partno 0", () => {
    const result = mapProduct({ ...valveRecord, partno: 0 }, "ANSI_VALVE");
    expect(result).toBeNull();
  });

  it("returns null for records with empty description", () => {
    const result = mapProduct({ ...valveRecord, desc1: "      " }, "ANSI_VALVE");
    expect(result).toBeNull();
  });

  it("treats missing price fields as null", () => {
    const sparseRecord = {
      partno: 200,
      desc1: "Simple Item   ",
      bore: "",
      typeno: 1,
      price1: 100.0,
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
});
