import { describe, it, expect } from "vitest";
import {
  calculateLineTotal,
  calculateDrtMarkup,
  calculateFittingPrice3,
  calculateDhtPrice,
  DRT_MARKUP,
  FITTING_PRICE3_MARKUP,
  DHT_RATE,
  DHT_MIN_PRICE,
  DHT_PI,
} from "./pricing";

describe("constants", () => {
  it("exports correct pricing constants", () => {
    expect(DRT_MARKUP).toBe(1.3);
    expect(FITTING_PRICE3_MARKUP).toBe(1.1);
    expect(DHT_RATE).toBe(0.67);
    expect(DHT_MIN_PRICE).toBe(5.75);
    expect(DHT_PI).toBe(3.14);
  });
});

describe("calculateLineTotal", () => {
  it("multiplies quantity by unit price", () => {
    expect(calculateLineTotal(5, 100)).toBe(500);
  });

  it("rounds to 2 decimal places", () => {
    expect(calculateLineTotal(3, 33.333)).toBe(99.99);
  });

  it("handles zero quantity", () => {
    expect(calculateLineTotal(0, 100)).toBe(0);
  });
});

describe("calculateDrtMarkup", () => {
  it("applies 1.3x markup", () => {
    expect(calculateDrtMarkup(100)).toBe(130);
  });

  it("rounds to 2 decimal places", () => {
    expect(calculateDrtMarkup(33.33)).toBe(43.33);
  });

  it("handles zero", () => {
    expect(calculateDrtMarkup(0)).toBe(0);
  });
});

describe("calculateFittingPrice3", () => {
  it("applies 1.1x markup", () => {
    expect(calculateFittingPrice3(100)).toBe(110);
  });

  it("rounds to 2 decimal places", () => {
    expect(calculateFittingPrice3(33.33)).toBe(36.66);
  });

  it("handles zero", () => {
    expect(calculateFittingPrice3(0)).toBe(0);
  });
});

describe("calculateDhtPrice", () => {
  it("calculates area-based price (diameter x length x pi x rate)", () => {
    // 4 x 10 x 3.14 x 0.67 = 84.152 -> 84.15
    expect(calculateDhtPrice(4, 10)).toBe(84.15);
  });

  it("enforces minimum price of $5.75", () => {
    // 0.1 x 0.1 x 3.14 x 0.67 = 0.02 -> below min -> 5.75
    expect(calculateDhtPrice(0.1, 0.1)).toBe(5.75);
  });

  it("rounds to 2 decimal places", () => {
    // 3 x 7 x 3.14 x 0.67 = 44.1756 -> 44.18
    expect(calculateDhtPrice(3, 7)).toBe(44.18);
  });

  it("handles zero dimensions", () => {
    expect(calculateDhtPrice(0, 10)).toBe(5.75);
  });
});
