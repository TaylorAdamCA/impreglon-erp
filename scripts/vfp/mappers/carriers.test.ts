import { describe, it, expect } from "vitest";
import { mapCarrier } from "./carriers";

describe("mapCarrier", () => {
  it("maps VFP carrier record with trimming", () => {
    const result = mapCarrier({
      custno: 101,
      carriername: "Day & Ross        ",
      account: "ACC-12345  ",
      phone: "1-800-555-0000",
    });
    expect(result).toEqual({
      custNo: 101,
      name: "Day & Ross",
      account: "ACC-12345",
      phone: "1-800-555-0000",
      isDefault: false,
    });
  });

  it("returns null for records with custno 0", () => {
    expect(mapCarrier({ custno: 0, carriername: "Test" })).toBeNull();
  });
});
