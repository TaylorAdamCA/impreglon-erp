import { describe, it, expect } from "vitest";
import {
  createOrderSchema,
  updateOrderSchema,
  orderDetailSchema,
  orderStatusSchema,
  ORDER_STATUS_ACTIONS,
} from "./order";
import { LIBRARY_TYPES } from "./product";

// ---------------------------------------------------------------------------
// createOrderSchema
// ---------------------------------------------------------------------------
describe("createOrderSchema", () => {
  it("accepts valid data with all fields", () => {
    const result = createOrderSchema.safeParse({
      customerId: "cust-123",
      poNumber: "PO-001",
      shipDate: "2026-03-15",
      dueDate: "2026-04-01",
      gstRate: 5,
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal valid data (only customerId)", () => {
    const result = createOrderSchema.safeParse({
      customerId: "cust-123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gstRate).toBe(5); // default
    }
  });

  it("rejects missing customerId", () => {
    const result = createOrderSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty customerId", () => {
    const result = createOrderSchema.safeParse({ customerId: "" });
    expect(result.success).toBe(false);
  });

  it("accepts empty string for poNumber", () => {
    const result = createOrderSchema.safeParse({
      customerId: "cust-123",
      poNumber: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects poNumber longer than 100 characters", () => {
    const result = createOrderSchema.safeParse({
      customerId: "cust-123",
      poNumber: "x".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("accepts poNumber at exactly 100 characters", () => {
    const result = createOrderSchema.safeParse({
      customerId: "cust-123",
      poNumber: "x".repeat(100),
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional shipDate and dueDate", () => {
    const result = createOrderSchema.safeParse({
      customerId: "cust-123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shipDate).toBeUndefined();
      expect(result.data.dueDate).toBeUndefined();
    }
  });

  it("accepts ISO date strings for shipDate and dueDate", () => {
    const result = createOrderSchema.safeParse({
      customerId: "cust-123",
      shipDate: "2026-06-15",
      dueDate: "2026-07-01",
    });
    expect(result.success).toBe(true);
  });

  it("defaults gstRate to 5 when not provided", () => {
    const result = createOrderSchema.safeParse({
      customerId: "cust-123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gstRate).toBe(5);
    }
  });

  it("accepts gstRate of 0", () => {
    const result = createOrderSchema.safeParse({
      customerId: "cust-123",
      gstRate: 0,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gstRate).toBe(0);
    }
  });

  it("accepts gstRate of 100", () => {
    const result = createOrderSchema.safeParse({
      customerId: "cust-123",
      gstRate: 100,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative gstRate", () => {
    const result = createOrderSchema.safeParse({
      customerId: "cust-123",
      gstRate: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects gstRate greater than 100", () => {
    const result = createOrderSchema.safeParse({
      customerId: "cust-123",
      gstRate: 101,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateOrderSchema
// ---------------------------------------------------------------------------
describe("updateOrderSchema", () => {
  it("accepts valid data with all fields", () => {
    const result = updateOrderSchema.safeParse({
      customerId: "cust-456",
      poNumber: "PO-002",
      shipDate: "2026-05-01",
      dueDate: "2026-06-01",
      gstRate: 7,
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal valid data (only customerId)", () => {
    const result = updateOrderSchema.safeParse({
      customerId: "cust-456",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gstRate).toBe(5);
    }
  });

  it("rejects missing customerId", () => {
    const result = updateOrderSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty customerId", () => {
    const result = updateOrderSchema.safeParse({ customerId: "" });
    expect(result.success).toBe(false);
  });

  it("defaults gstRate to 5 when not provided", () => {
    const result = updateOrderSchema.safeParse({
      customerId: "cust-456",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gstRate).toBe(5);
    }
  });

  it("rejects negative gstRate", () => {
    const result = updateOrderSchema.safeParse({
      customerId: "cust-456",
      gstRate: -0.01,
    });
    expect(result.success).toBe(false);
  });

  it("rejects gstRate over 100", () => {
    const result = updateOrderSchema.safeParse({
      customerId: "cust-456",
      gstRate: 100.1,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// orderDetailSchema
// ---------------------------------------------------------------------------
describe("orderDetailSchema", () => {
  const validDetail = {
    description: "4-inch ANSI valve coating",
    quantity: 10,
    unitPrice: 250.0,
    coating: "Xylan 1070",
    libraryType: "ANSI_VALVE" as const,
    libraryItemId: "item-abc",
    coatingSlot: 3,
  };

  it("accepts valid data with all fields", () => {
    const result = orderDetailSchema.safeParse(validDetail);
    expect(result.success).toBe(true);
  });

  it("accepts minimal valid data (description, quantity, unitPrice)", () => {
    const result = orderDetailSchema.safeParse({
      description: "Manual entry",
      quantity: 1,
      unitPrice: 0,
    });
    expect(result.success).toBe(true);
  });

  // description
  it("rejects missing description", () => {
    const { description, ...rest } = validDetail;
    const result = orderDetailSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects empty description", () => {
    const result = orderDetailSchema.safeParse({
      ...validDetail,
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 500 characters", () => {
    const result = orderDetailSchema.safeParse({
      ...validDetail,
      description: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts description at exactly 500 characters", () => {
    const result = orderDetailSchema.safeParse({
      ...validDetail,
      description: "x".repeat(500),
    });
    expect(result.success).toBe(true);
  });

  // quantity
  it("rejects missing quantity", () => {
    const { quantity, ...rest } = validDetail;
    const result = orderDetailSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects quantity of 0", () => {
    const result = orderDetailSchema.safeParse({
      ...validDetail,
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative quantity", () => {
    const result = orderDetailSchema.safeParse({
      ...validDetail,
      quantity: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer quantity", () => {
    const result = orderDetailSchema.safeParse({
      ...validDetail,
      quantity: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("accepts quantity of 1 (minimum)", () => {
    const result = orderDetailSchema.safeParse({
      ...validDetail,
      quantity: 1,
    });
    expect(result.success).toBe(true);
  });

  // unitPrice
  it("rejects missing unitPrice", () => {
    const { unitPrice, ...rest } = validDetail;
    const result = orderDetailSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("accepts unitPrice of 0", () => {
    const result = orderDetailSchema.safeParse({
      ...validDetail,
      unitPrice: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative unitPrice", () => {
    const result = orderDetailSchema.safeParse({
      ...validDetail,
      unitPrice: -0.01,
    });
    expect(result.success).toBe(false);
  });

  it("accepts decimal unitPrice", () => {
    const result = orderDetailSchema.safeParse({
      ...validDetail,
      unitPrice: 99.99,
    });
    expect(result.success).toBe(true);
  });

  // coating
  it("accepts empty string for coating", () => {
    const result = orderDetailSchema.safeParse({
      ...validDetail,
      coating: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts omitted coating", () => {
    const { coating, ...rest } = validDetail;
    const result = orderDetailSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it("rejects coating longer than 200 characters", () => {
    const result = orderDetailSchema.safeParse({
      ...validDetail,
      coating: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("accepts coating at exactly 200 characters", () => {
    const result = orderDetailSchema.safeParse({
      ...validDetail,
      coating: "x".repeat(200),
    });
    expect(result.success).toBe(true);
  });

  // libraryType
  it("accepts all valid LIBRARY_TYPES", () => {
    for (const type of LIBRARY_TYPES) {
      const result = orderDetailSchema.safeParse({
        ...validDetail,
        libraryType: type,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid libraryType", () => {
    const result = orderDetailSchema.safeParse({
      ...validDetail,
      libraryType: "INVALID_TYPE",
    });
    expect(result.success).toBe(false);
  });

  it("accepts omitted libraryType", () => {
    const { libraryType, ...rest } = validDetail;
    const result = orderDetailSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  // libraryItemId
  it("accepts omitted libraryItemId", () => {
    const { libraryItemId, ...rest } = validDetail;
    const result = orderDetailSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  // coatingSlot
  it("accepts coatingSlot of 1 (minimum)", () => {
    const result = orderDetailSchema.safeParse({
      ...validDetail,
      coatingSlot: 1,
    });
    expect(result.success).toBe(true);
  });

  it("accepts coatingSlot of 8 (maximum)", () => {
    const result = orderDetailSchema.safeParse({
      ...validDetail,
      coatingSlot: 8,
    });
    expect(result.success).toBe(true);
  });

  it("rejects coatingSlot of 0", () => {
    const result = orderDetailSchema.safeParse({
      ...validDetail,
      coatingSlot: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects coatingSlot of 9", () => {
    const result = orderDetailSchema.safeParse({
      ...validDetail,
      coatingSlot: 9,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer coatingSlot", () => {
    const result = orderDetailSchema.safeParse({
      ...validDetail,
      coatingSlot: 2.5,
    });
    expect(result.success).toBe(false);
  });

  it("accepts omitted coatingSlot", () => {
    const { coatingSlot, ...rest } = validDetail;
    const result = orderDetailSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// orderStatusSchema
// ---------------------------------------------------------------------------
describe("orderStatusSchema", () => {
  it("accepts 'start' action", () => {
    const result = orderStatusSchema.safeParse({ action: "start" });
    expect(result.success).toBe(true);
  });

  it("accepts 'complete' action", () => {
    const result = orderStatusSchema.safeParse({ action: "complete" });
    expect(result.success).toBe(true);
  });

  it("accepts all valid ORDER_STATUS_ACTIONS", () => {
    for (const action of ORDER_STATUS_ACTIONS) {
      const result = orderStatusSchema.safeParse({ action });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid action", () => {
    const result = orderStatusSchema.safeParse({ action: "cancel" });
    expect(result.success).toBe(false);
  });

  it("rejects missing action", () => {
    const result = orderStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty string action", () => {
    const result = orderStatusSchema.safeParse({ action: "" });
    expect(result.success).toBe(false);
  });

  it("accepts action with notes", () => {
    const result = orderStatusSchema.safeParse({
      action: "start",
      notes: "Starting production run",
    });
    expect(result.success).toBe(true);
  });

  it("accepts action without notes", () => {
    const result = orderStatusSchema.safeParse({ action: "complete" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// ORDER_STATUS_ACTIONS constant
// ---------------------------------------------------------------------------
describe("ORDER_STATUS_ACTIONS", () => {
  it("contains exactly 'start' and 'complete'", () => {
    expect(ORDER_STATUS_ACTIONS).toEqual(["start", "complete"]);
  });

  it("has length of 2", () => {
    expect(ORDER_STATUS_ACTIONS).toHaveLength(2);
  });
});
