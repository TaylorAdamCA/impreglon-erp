import { describe, it, expect } from "vitest";
import {
  customerSchema,
  contactSchema,
  shipToSchema,
  carrierSchema,
} from "./customer";

describe("customerSchema", () => {
  const validCustomer = {
    company: "Acme Oil & Gas",
    address1: "123 Main St",
    city: "Calgary",
    province: "AB",
    postalCode: "T2P 1A1",
    phone: "403-555-1234",
    email: "info@acme.com",
    terms: "Net 30",
  };

  it("accepts valid customer data", () => {
    const result = customerSchema.safeParse(validCustomer);
    expect(result.success).toBe(true);
  });

  it("accepts minimal data (company only)", () => {
    const result = customerSchema.safeParse({ company: "Acme" });
    expect(result.success).toBe(true);
  });

  it("rejects missing company name", () => {
    const result = customerSchema.safeParse({ city: "Calgary" });
    expect(result.success).toBe(false);
  });

  it("rejects empty company name", () => {
    const result = customerSchema.safeParse({ company: "" });
    expect(result.success).toBe(false);
  });

  it("rejects company name exceeding 200 chars", () => {
    const result = customerSchema.safeParse({ company: "A".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("accepts empty string for optional email", () => {
    const result = customerSchema.safeParse({ company: "Acme", email: "" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", () => {
    const result = customerSchema.safeParse({
      company: "Acme",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid email format", () => {
    const result = customerSchema.safeParse({
      company: "Acme",
      email: "test@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects address1 exceeding 200 chars", () => {
    const result = customerSchema.safeParse({
      company: "Acme",
      address1: "A".repeat(201),
    });
    expect(result.success).toBe(false);
  });
});

describe("contactSchema", () => {
  const validContact = {
    name: "John Smith",
    title: "VP Operations",
    phone: "403-555-5678",
    email: "john@acme.com",
    department: "Operations",
    isPrimary: true,
  };

  it("accepts valid contact data", () => {
    const result = contactSchema.safeParse(validContact);
    expect(result.success).toBe(true);
  });

  it("rejects missing contact name", () => {
    const result = contactSchema.safeParse({ isPrimary: false });
    expect(result.success).toBe(false);
  });

  it("rejects missing isPrimary", () => {
    const result = contactSchema.safeParse({ name: "John" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format on contact", () => {
    const result = contactSchema.safeParse({
      name: "John",
      isPrimary: false,
      email: "bad-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty string for optional contact email", () => {
    const result = contactSchema.safeParse({
      name: "John",
      isPrimary: false,
      email: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name exceeding 200 chars", () => {
    const result = contactSchema.safeParse({
      name: "A".repeat(201),
      isPrimary: false,
    });
    expect(result.success).toBe(false);
  });
});

describe("shipToSchema", () => {
  const validShipTo = {
    name: "Acme Warehouse",
    address1: "456 Industrial Blvd",
    city: "Edmonton",
    province: "AB",
    postalCode: "T5J 1S9",
    isDefault: true,
  };

  it("accepts valid ship-to data", () => {
    const result = shipToSchema.safeParse(validShipTo);
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = shipToSchema.safeParse({
      address1: "456 Industrial",
      city: "Edmonton",
      isDefault: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing address1", () => {
    const result = shipToSchema.safeParse({
      name: "Warehouse",
      city: "Edmonton",
      isDefault: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing city", () => {
    const result = shipToSchema.safeParse({
      name: "Warehouse",
      address1: "456 Industrial",
      isDefault: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing isDefault", () => {
    const result = shipToSchema.safeParse({
      name: "Warehouse",
      address1: "456 Industrial",
      city: "Edmonton",
    });
    expect(result.success).toBe(false);
  });
});

describe("carrierSchema", () => {
  const validCarrier = {
    name: "FedEx",
    account: "ACCT-1234",
    phone: "1-800-463-3339",
    isDefault: true,
  };

  it("accepts valid carrier data", () => {
    const result = carrierSchema.safeParse(validCarrier);
    expect(result.success).toBe(true);
  });

  it("rejects missing carrier name", () => {
    const result = carrierSchema.safeParse({ isDefault: false });
    expect(result.success).toBe(false);
  });

  it("rejects missing isDefault", () => {
    const result = carrierSchema.safeParse({ name: "FedEx" });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 200 chars", () => {
    const result = carrierSchema.safeParse({
      name: "A".repeat(201),
      isDefault: false,
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty string for optional account", () => {
    const result = carrierSchema.safeParse({
      name: "FedEx",
      account: "",
      isDefault: false,
    });
    expect(result.success).toBe(true);
  });
});
