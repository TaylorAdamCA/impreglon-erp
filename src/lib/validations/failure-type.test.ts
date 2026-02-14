import { describe, it, expect } from "vitest";
import {
  failureTypeSchema,
  updateFailureTypeSchema,
  FAILURE_TYPE_CATEGORIES,
} from "./failure-type";

describe("failureTypeSchema", () => {
  const validData = {
    code: "PEEL",
    description: "Coating peeling from substrate",
  };

  it("accepts valid data", () => {
    const result = failureTypeSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects missing code", () => {
    const result = failureTypeSchema.safeParse({
      description: "Some description",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty code", () => {
    const result = failureTypeSchema.safeParse({
      code: "",
      description: "Some description",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing description", () => {
    const result = failureTypeSchema.safeParse({
      code: "PEEL",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty description", () => {
    const result = failureTypeSchema.safeParse({
      code: "PEEL",
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects code exceeding 50 chars", () => {
    const result = failureTypeSchema.safeParse({
      code: "A".repeat(51),
      description: "Some description",
    });
    expect(result.success).toBe(false);
  });

  it("accepts code at exactly 50 chars", () => {
    const result = failureTypeSchema.safeParse({
      code: "A".repeat(50),
      description: "Some description",
    });
    expect(result.success).toBe(true);
  });

  it("rejects description exceeding 500 chars", () => {
    const result = failureTypeSchema.safeParse({
      code: "PEEL",
      description: "A".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts description at exactly 500 chars", () => {
    const result = failureTypeSchema.safeParse({
      code: "PEEL",
      description: "A".repeat(500),
    });
    expect(result.success).toBe(true);
  });
});

describe("updateFailureTypeSchema", () => {
  const validData = {
    code: "PEEL",
    description: "Coating peeling from substrate",
  };

  it("accepts valid data without isActive", () => {
    const result = updateFailureTypeSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("accepts valid data with isActive true", () => {
    const result = updateFailureTypeSchema.safeParse({
      ...validData,
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid data with isActive false", () => {
    const result = updateFailureTypeSchema.safeParse({
      ...validData,
      isActive: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing code", () => {
    const result = updateFailureTypeSchema.safeParse({
      description: "Some description",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty code", () => {
    const result = updateFailureTypeSchema.safeParse({
      code: "",
      description: "Some description",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing description", () => {
    const result = updateFailureTypeSchema.safeParse({
      code: "PEEL",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean isActive", () => {
    const result = updateFailureTypeSchema.safeParse({
      ...validData,
      isActive: "yes",
    });
    expect(result.success).toBe(false);
  });
});

describe("FAILURE_TYPE_CATEGORIES", () => {
  it("contains 'coating'", () => {
    expect(FAILURE_TYPE_CATEGORIES).toContain("coating");
  });

  it("contains 'method'", () => {
    expect(FAILURE_TYPE_CATEGORIES).toContain("method");
  });

  it("has exactly 2 categories", () => {
    expect(FAILURE_TYPE_CATEGORIES).toHaveLength(2);
  });
});
