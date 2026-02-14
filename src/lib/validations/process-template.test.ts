import { describe, it, expect } from "vitest";
import {
  createProcessTemplateSchema,
  updateProcessTemplateSchema,
  processTemplateStepSchema,
} from "./process-template";

describe("processTemplateStepSchema", () => {
  it("accepts valid step data", () => {
    const result = processTemplateStepSchema.safeParse({
      operationName: "Sandblast",
      description: "Remove existing coating",
    });
    expect(result.success).toBe(true);
  });

  it("accepts step without description", () => {
    const result = processTemplateStepSchema.safeParse({
      operationName: "Sandblast",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing operationName", () => {
    const result = processTemplateStepSchema.safeParse({
      description: "Some description",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty operationName", () => {
    const result = processTemplateStepSchema.safeParse({
      operationName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects operationName exceeding 200 chars", () => {
    const result = processTemplateStepSchema.safeParse({
      operationName: "A".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects description exceeding 500 chars", () => {
    const result = processTemplateStepSchema.safeParse({
      operationName: "Sandblast",
      description: "A".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe("createProcessTemplateSchema", () => {
  const validTemplate = {
    name: "Standard Xylan Coating",
    description: "Standard process for Xylan 1070 coating",
    steps: [
      { operationName: "Sandblast", description: "Grit blast to white metal" },
      { operationName: "Prime", description: "Apply primer coat" },
      { operationName: "Top Coat", description: "Apply Xylan 1070 top coat" },
      { operationName: "Cure", description: "Bake at 400F for 30 min" },
    ],
  };

  it("accepts valid template data", () => {
    const result = createProcessTemplateSchema.safeParse(validTemplate);
    expect(result.success).toBe(true);
  });

  it("accepts minimal template (name + one step)", () => {
    const result = createProcessTemplateSchema.safeParse({
      name: "Simple Process",
      steps: [{ operationName: "Single Step" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = createProcessTemplateSchema.safeParse({
      steps: [{ operationName: "Sandblast" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createProcessTemplateSchema.safeParse({
      name: "",
      steps: [{ operationName: "Sandblast" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 200 chars", () => {
    const result = createProcessTemplateSchema.safeParse({
      name: "A".repeat(201),
      steps: [{ operationName: "Sandblast" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty steps array", () => {
    const result = createProcessTemplateSchema.safeParse({
      name: "No Steps Template",
      steps: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing steps", () => {
    const result = createProcessTemplateSchema.safeParse({
      name: "No Steps Template",
    });
    expect(result.success).toBe(false);
  });

  it("rejects step with missing operationName", () => {
    const result = createProcessTemplateSchema.safeParse({
      name: "Bad Template",
      steps: [{ description: "Missing operation name" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects description exceeding 500 chars", () => {
    const result = createProcessTemplateSchema.safeParse({
      name: "Test Template",
      description: "A".repeat(501),
      steps: [{ operationName: "Sandblast" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("updateProcessTemplateSchema", () => {
  const validUpdate = {
    name: "Updated Xylan Coating",
    description: "Updated process",
    isActive: true,
    steps: [
      { operationName: "Sandblast" },
      { operationName: "Prime" },
      { operationName: "Top Coat" },
    ],
  };

  it("accepts valid update data", () => {
    const result = updateProcessTemplateSchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
  });

  it("accepts update with isActive set to false", () => {
    const result = updateProcessTemplateSchema.safeParse({
      ...validUpdate,
      isActive: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepts update without isActive", () => {
    const result = updateProcessTemplateSchema.safeParse({
      name: "Updated Template",
      steps: [{ operationName: "Sandblast" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty steps array", () => {
    const result = updateProcessTemplateSchema.safeParse({
      name: "Updated Template",
      steps: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const result = updateProcessTemplateSchema.safeParse({
      steps: [{ operationName: "Sandblast" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing steps", () => {
    const result = updateProcessTemplateSchema.safeParse({
      name: "Updated Template",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 200 chars", () => {
    const result = updateProcessTemplateSchema.safeParse({
      name: "A".repeat(201),
      steps: [{ operationName: "Sandblast" }],
    });
    expect(result.success).toBe(false);
  });
});
