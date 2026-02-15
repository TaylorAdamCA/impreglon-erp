import { describe, it, expect } from "vitest";
import { mapCarrier } from "./carriers";

describe("mapCarrier", () => {
  it("maps VFP carrier record with only 3 fields", () => {
    const result = mapCarrier({
      CARRIERNO: 1,
      CUSTNO: "GUIBE    ",
      CARRIERNAM: "Day & Ross               ",
    });
    expect(result).toEqual({
      custCode: "GUIBE",
      name: "Day & Ross",
      account: null,
      phone: null,
      isDefault: false,
    });
  });

  it("returns null for records with empty CUSTNO", () => {
    expect(mapCarrier({ CUSTNO: "         ", CARRIERNAM: "Test" })).toBeNull();
  });
});
