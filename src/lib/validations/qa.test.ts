import { describe, it, expect } from "vitest";
import {
  inspectItemSchema,
  qaStatusSchema,
  reworkPlanSchema,
  reworkActionSchema,
} from "./qa";

describe("inspectItemSchema", () => {
  const validData = {
    detailId: "detail-abc-123",
    currentPass: 1,
  };

  it("accepts valid data", () => {
    const result = inspectItemSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("accepts valid data with reworkQty", () => {
    const result = inspectItemSchema.safeParse({
      ...validData,
      reworkQty: 5,
    });
    expect(result.success).toBe(true);
  });

  it("accepts currentPass of zero", () => {
    const result = inspectItemSchema.safeParse({
      ...validData,
      currentPass: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts reworkQty of zero", () => {
    const result = inspectItemSchema.safeParse({
      ...validData,
      reworkQty: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing detailId", () => {
    const result = inspectItemSchema.safeParse({ currentPass: 1 });
    expect(result.success).toBe(false);
  });

  it("rejects empty detailId", () => {
    const result = inspectItemSchema.safeParse({
      detailId: "",
      currentPass: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative currentPass", () => {
    const result = inspectItemSchema.safeParse({
      detailId: "detail-abc-123",
      currentPass: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative reworkQty", () => {
    const result = inspectItemSchema.safeParse({
      ...validData,
      reworkQty: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer currentPass", () => {
    const result = inspectItemSchema.safeParse({
      detailId: "detail-abc-123",
      currentPass: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer reworkQty", () => {
    const result = inspectItemSchema.safeParse({
      ...validData,
      reworkQty: 2.5,
    });
    expect(result.success).toBe(false);
  });
});

describe("qaStatusSchema", () => {
  it("accepts valid 'rework' action", () => {
    const result = qaStatusSchema.safeParse({ action: "rework" });
    expect(result.success).toBe(true);
  });

  it("accepts valid 'pass' action", () => {
    const result = qaStatusSchema.safeParse({ action: "pass" });
    expect(result.success).toBe(true);
  });

  it("accepts valid 'return' action", () => {
    const result = qaStatusSchema.safeParse({ action: "return" });
    expect(result.success).toBe(true);
  });

  it("accepts action with notes", () => {
    const result = qaStatusSchema.safeParse({
      action: "rework",
      notes: "Coating peeled on edge",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid action", () => {
    const result = qaStatusSchema.safeParse({ action: "reject" });
    expect(result.success).toBe(false);
  });

  it("rejects missing action", () => {
    const result = qaStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects notes exceeding 500 chars", () => {
    const result = qaStatusSchema.safeParse({
      action: "rework",
      notes: "A".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts notes at exactly 500 chars", () => {
    const result = qaStatusSchema.safeParse({
      action: "pass",
      notes: "A".repeat(500),
    });
    expect(result.success).toBe(true);
  });
});

describe("reworkPlanSchema", () => {
  const validFullData = {
    reworkId: "rework-abc-123",
    productType: "222M" as const,
    templateId: "template-xyz",
    qaNotes: "Needs full recoat",
    coatingFailure: "Peeling",
    methodFailure: "Temperature too low",
    operations: "Strip and recoat",
    department: "Coating Bay 2",
  };

  it("accepts valid full data", () => {
    const result = reworkPlanSchema.safeParse(validFullData);
    expect(result.success).toBe(true);
  });

  it("accepts minimal data (just reworkId + productType)", () => {
    const result = reworkPlanSchema.safeParse({
      reworkId: "rework-abc-123",
      productType: "505",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all productType values", () => {
    for (const type of ["222M", "505", "Other", "Custom", "Re-Rework"]) {
      const result = reworkPlanSchema.safeParse({
        reworkId: "rework-abc-123",
        productType: type,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid productType", () => {
    const result = reworkPlanSchema.safeParse({
      reworkId: "rework-abc-123",
      productType: "InvalidType",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing reworkId", () => {
    const result = reworkPlanSchema.safeParse({
      productType: "222M",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty reworkId", () => {
    const result = reworkPlanSchema.safeParse({
      reworkId: "",
      productType: "222M",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing productType", () => {
    const result = reworkPlanSchema.safeParse({
      reworkId: "rework-abc-123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects qaNotes exceeding 2000 chars", () => {
    const result = reworkPlanSchema.safeParse({
      reworkId: "rework-abc-123",
      productType: "222M",
      qaNotes: "A".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts qaNotes at exactly 2000 chars", () => {
    const result = reworkPlanSchema.safeParse({
      reworkId: "rework-abc-123",
      productType: "222M",
      qaNotes: "A".repeat(2000),
    });
    expect(result.success).toBe(true);
  });

  it("rejects coatingFailure exceeding 200 chars", () => {
    const result = reworkPlanSchema.safeParse({
      reworkId: "rework-abc-123",
      productType: "222M",
      coatingFailure: "A".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects methodFailure exceeding 200 chars", () => {
    const result = reworkPlanSchema.safeParse({
      reworkId: "rework-abc-123",
      productType: "222M",
      methodFailure: "A".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects operations exceeding 500 chars", () => {
    const result = reworkPlanSchema.safeParse({
      reworkId: "rework-abc-123",
      productType: "222M",
      operations: "A".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects department exceeding 200 chars", () => {
    const result = reworkPlanSchema.safeParse({
      reworkId: "rework-abc-123",
      productType: "222M",
      department: "A".repeat(201),
    });
    expect(result.success).toBe(false);
  });
});

describe("reworkActionSchema", () => {
  it("accepts valid 'start' action", () => {
    const result = reworkActionSchema.safeParse({ action: "start" });
    expect(result.success).toBe(true);
  });

  it("accepts valid 'resolve' action", () => {
    const result = reworkActionSchema.safeParse({ action: "resolve" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid action", () => {
    const result = reworkActionSchema.safeParse({ action: "cancel" });
    expect(result.success).toBe(false);
  });

  it("rejects missing action", () => {
    const result = reworkActionSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
