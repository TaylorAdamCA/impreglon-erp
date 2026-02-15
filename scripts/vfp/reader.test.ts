import { describe, it, expect } from "vitest";
import { readDbfRecords } from "./reader";

describe("readDbfRecords", () => {
  it("should export a function", () => {
    expect(typeof readDbfRecords).toBe("function");
  });
});
