import { describe, it, expect } from "vitest";
import {
  receiveItemSchema,
  assignTemplateSchema,
  processStepSchema,
  shipOrderSchema,
} from "./shop";

describe("receiveItemSchema", () => {
  const validData = {
    detailId: "detail-abc-123",
    received: true,
  };

  it("accepts valid data", () => {
    const result = receiveItemSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("accepts received as false", () => {
    const result = receiveItemSchema.safeParse({
      detailId: "detail-abc-123",
      received: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing detailId", () => {
    const result = receiveItemSchema.safeParse({ received: true });
    expect(result.success).toBe(false);
  });

  it("rejects empty detailId", () => {
    const result = receiveItemSchema.safeParse({ detailId: "", received: true });
    expect(result.success).toBe(false);
  });

  it("rejects missing received", () => {
    const result = receiveItemSchema.safeParse({ detailId: "detail-abc-123" });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean received", () => {
    const result = receiveItemSchema.safeParse({
      detailId: "detail-abc-123",
      received: "yes",
    });
    expect(result.success).toBe(false);
  });
});

describe("assignTemplateSchema", () => {
  it("accepts valid data", () => {
    const result = assignTemplateSchema.safeParse({
      templateId: "template-abc-123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty templateId", () => {
    const result = assignTemplateSchema.safeParse({ templateId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing templateId", () => {
    const result = assignTemplateSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("processStepSchema", () => {
  const validData = {
    stepId: "step-abc-123",
    completed: true,
  };

  it("accepts valid data without notes", () => {
    const result = processStepSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("accepts valid data with notes", () => {
    const result = processStepSchema.safeParse({
      ...validData,
      notes: "Completed with no issues",
    });
    expect(result.success).toBe(true);
  });

  it("accepts completed as false", () => {
    const result = processStepSchema.safeParse({
      stepId: "step-abc-123",
      completed: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing stepId", () => {
    const result = processStepSchema.safeParse({ completed: true });
    expect(result.success).toBe(false);
  });

  it("rejects empty stepId", () => {
    const result = processStepSchema.safeParse({ stepId: "", completed: true });
    expect(result.success).toBe(false);
  });

  it("rejects missing completed", () => {
    const result = processStepSchema.safeParse({ stepId: "step-abc-123" });
    expect(result.success).toBe(false);
  });

  it("rejects notes exceeding 500 chars", () => {
    const result = processStepSchema.safeParse({
      ...validData,
      notes: "A".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts notes at exactly 500 chars", () => {
    const result = processStepSchema.safeParse({
      ...validData,
      notes: "A".repeat(500),
    });
    expect(result.success).toBe(true);
  });
});

describe("shipOrderSchema", () => {
  const validData = {
    shipToAddressId: "addr-1",
    carrierName: "FedEx",
  };

  it("accepts valid required fields", () => {
    const result = shipOrderSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("accepts all fields", () => {
    const result = shipOrderSchema.safeParse({
      ...validData,
      trackingNumber: "1Z999AA10123456784",
      notes: "Handle with care",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing shipToAddressId", () => {
    const result = shipOrderSchema.safeParse({
      carrierName: "FedEx",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty shipToAddressId", () => {
    const result = shipOrderSchema.safeParse({
      ...validData,
      shipToAddressId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing carrierName", () => {
    const result = shipOrderSchema.safeParse({
      shipToAddressId: "addr-1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty carrierName", () => {
    const result = shipOrderSchema.safeParse({
      ...validData,
      carrierName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects trackingNumber exceeding 100 chars", () => {
    const result = shipOrderSchema.safeParse({
      ...validData,
      trackingNumber: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects notes exceeding 500 chars", () => {
    const result = shipOrderSchema.safeParse({
      ...validData,
      notes: "A".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts notes at exactly 500 chars", () => {
    const result = shipOrderSchema.safeParse({
      ...validData,
      notes: "A".repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it("accepts undefined optional fields", () => {
    const result = shipOrderSchema.safeParse({
      ...validData,
      trackingNumber: undefined,
      notes: undefined,
    });
    expect(result.success).toBe(true);
  });
});
