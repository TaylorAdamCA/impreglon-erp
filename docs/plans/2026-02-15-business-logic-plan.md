# Business Logic Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract shared business logic into reusable utility modules (pricing, GST, business days), refactor existing routes to use them, and add DHT area-based pricing.

**Architecture:** Three new utility modules (`src/lib/pricing.ts`, `src/lib/gst.ts`, `src/lib/business-days.ts`) with pure functions and named constants. Existing routes refactored to import shared functions instead of inline math. Holiday seed data added to `prisma/seed.ts`.

**Tech Stack:** TypeScript, Vitest, Prisma 6, Next.js 16

---

### Task 1: Pricing Utility — Tests

**Files:**
- Create: `src/lib/pricing.test.ts`

**Step 1: Write failing tests**

Create `src/lib/pricing.test.ts`:

```typescript
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
  it("calculates area-based price (diameter × length × π × rate)", () => {
    // 4 × 10 × 3.14 × 0.67 = 84.15
    expect(calculateDhtPrice(4, 10)).toBe(84.15);
  });

  it("enforces minimum price of $5.75", () => {
    // 0.1 × 0.1 × 3.14 × 0.67 = 0.02 → below min → 5.75
    expect(calculateDhtPrice(0.1, 0.1)).toBe(5.75);
  });

  it("rounds to 2 decimal places", () => {
    // 3 × 7 × 3.14 × 0.67 = 44.18
    expect(calculateDhtPrice(3, 7)).toBe(44.18);
  });

  it("handles zero dimensions", () => {
    expect(calculateDhtPrice(0, 10)).toBe(5.75); // below min
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/pricing.test.ts
```
Expected: FAIL — module not found.

---

### Task 2: Pricing Utility — Implementation

**Files:**
- Create: `src/lib/pricing.ts`

**Step 1: Write implementation**

Create `src/lib/pricing.ts`:

```typescript
// Pricing constants — change these to adjust calculations globally
export const DRT_MARKUP = 1.3;
export const FITTING_PRICE3_MARKUP = 1.1;
export const DHT_RATE = 0.67;
export const DHT_MIN_PRICE = 5.75;
export const DHT_PI = 3.14;

/** Calculate line item total: quantity × unitPrice, rounded to 2 decimals */
export function calculateLineTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

/** Calculate DRT selling price from cost: cost × 1.3 */
export function calculateDrtMarkup(cost: number): number {
  return Math.round(cost * DRT_MARKUP * 100) / 100;
}

/** Calculate fitting coatingPrice3 from coatingPrice1: price1 × 1.1 */
export function calculateFittingPrice3(coatingPrice1: number): number {
  return Math.round(coatingPrice1 * FITTING_PRICE3_MARKUP * 100) / 100;
}

/** Calculate DHT area-based price: diameter × length × π × rate, min $5.75 */
export function calculateDhtPrice(diameter: number, length: number): number {
  const price = Math.round(diameter * length * DHT_PI * DHT_RATE * 100) / 100;
  return Math.max(price, DHT_MIN_PRICE);
}
```

**Step 2: Run tests**

```bash
npx vitest run src/lib/pricing.test.ts
```
Expected: All 13 tests pass.

**Step 3: Run full suite**

```bash
npx vitest run
```
Expected: All tests pass (712 + 13 = 725).

**Step 4: Commit**

```bash
git add src/lib/pricing.ts src/lib/pricing.test.ts
git commit -m "feat: add shared pricing utility with tests"
```

---

### Task 3: GST Utility — Tests

**Files:**
- Create: `src/lib/gst.test.ts`

**Step 1: Write failing tests**

Create `src/lib/gst.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { lookupGstRate, calculateGst } from "./gst";

const mockPrisma = vi.mocked(prisma);

describe("calculateGst", () => {
  it("calculates GST from total and rate", () => {
    expect(calculateGst(10000, 5)).toBe(500);
  });

  it("rounds to 2 decimal places", () => {
    expect(calculateGst(99.99, 5)).toBe(5);
  });

  it("returns 0 for 0% rate", () => {
    expect(calculateGst(10000, 0)).toBe(0);
  });

  it("returns 0 for 0 total", () => {
    expect(calculateGst(0, 5)).toBe(0);
  });
});

describe("lookupGstRate", () => {
  it("returns rate when found", async () => {
    mockPrisma.taxRate.findFirst.mockResolvedValueOnce({
      id: "tr-1",
      taxId: "GST",
      rate: 5,
      effectiveDate: new Date("2020-01-01"),
      expiryDate: new Date("2099-12-31"),
    } as never);

    const rate = await lookupGstRate(new Date("2026-01-15"));
    expect(rate).toBe(5);
  });

  it("returns null when no rate found", async () => {
    mockPrisma.taxRate.findFirst.mockResolvedValueOnce(null);

    const rate = await lookupGstRate(new Date("1990-01-01"));
    expect(rate).toBeNull();
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/gst.test.ts
```
Expected: FAIL — module not found.

---

### Task 4: GST Utility — Implementation

**Files:**
- Create: `src/lib/gst.ts`

**Step 1: Write implementation**

Create `src/lib/gst.ts`:

```typescript
import { prisma } from "@/lib/prisma";

/** Calculate GST amount: orderTotal × (rate / 100), rounded to 2 decimals */
export function calculateGst(orderTotal: number, rate: number): number {
  return Math.round(orderTotal * (rate / 100) * 100) / 100;
}

/** Look up GST rate from TaxRate table for a given date. Returns rate or null. */
export async function lookupGstRate(date: Date): Promise<number | null> {
  const taxRate = await prisma.taxRate.findFirst({
    where: {
      taxId: "GST",
      effectiveDate: { lte: date },
      expiryDate: { gte: date },
    },
  });

  return taxRate ? Number(taxRate.rate) : null;
}
```

**Step 2: Run tests**

```bash
npx vitest run src/lib/gst.test.ts
```
Expected: All 6 tests pass.

**Step 3: Run full suite**

```bash
npx vitest run
```
Expected: All tests pass (725 + 6 = 731).

**Step 4: Commit**

```bash
git add src/lib/gst.ts src/lib/gst.test.ts
git commit -m "feat: add shared GST utility with tests"
```

---

### Task 5: Business Days Utility — Tests

**Files:**
- Create: `src/lib/business-days.test.ts`

**Step 1: Write failing tests**

Create `src/lib/business-days.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  resolveHolidayDate,
  applyWeekendShift,
  isHoliday,
  countBusinessDays,
  addBusinessDays,
} from "./business-days";

// Holiday definitions matching the Holiday model shape
const CHRISTMAS = { name: "Christmas Day", month: 12, day: 25, dayOfWeek: null, occurrence: null, holidayType: "FIXED" as const, isActive: true };
const LABOUR_DAY = { name: "Labour Day", month: 9, day: null, dayOfWeek: 2, occurrence: 1, holidayType: "FLOATING" as const, isActive: true };
const THANKSGIVING = { name: "Thanksgiving", month: 10, day: null, dayOfWeek: 2, occurrence: 2, holidayType: "FLOATING" as const, isActive: true };
const INACTIVE = { name: "Inactive", month: 1, day: 1, dayOfWeek: null, occurrence: null, holidayType: "FIXED" as const, isActive: false };

describe("applyWeekendShift", () => {
  it("shifts Saturday to Friday", () => {
    // 2026-12-26 is Saturday
    const result = applyWeekendShift(new Date(2026, 11, 26));
    expect(result.getDate()).toBe(25); // Friday
  });

  it("shifts Sunday to Monday", () => {
    // 2027-01-03 is Sunday
    const result = applyWeekendShift(new Date(2027, 0, 3));
    expect(result.getDate()).toBe(4); // Monday
  });

  it("returns weekday unchanged", () => {
    // 2026-12-25 is Friday
    const result = applyWeekendShift(new Date(2026, 11, 25));
    expect(result.getDate()).toBe(25);
  });
});

describe("resolveHolidayDate", () => {
  it("resolves fixed-date holiday", () => {
    const date = resolveHolidayDate(CHRISTMAS, 2026);
    expect(date?.getMonth()).toBe(11); // December
    expect(date?.getDate()).toBe(25);
  });

  it("resolves Nth weekday holiday (Labour Day = 1st Monday of September)", () => {
    // 2026-09-07 is 1st Monday of September
    const date = resolveHolidayDate(LABOUR_DAY, 2026);
    expect(date?.getMonth()).toBe(8); // September
    expect(date?.getDate()).toBe(7);
  });

  it("resolves 2nd weekday holiday (Thanksgiving = 2nd Monday of October)", () => {
    // 2026-10-12 is 2nd Monday of October
    const date = resolveHolidayDate(THANKSGIVING, 2026);
    expect(date?.getMonth()).toBe(9); // October
    expect(date?.getDate()).toBe(12);
  });

  it("returns null for inactive holidays", () => {
    const date = resolveHolidayDate(INACTIVE, 2026);
    expect(date).toBeNull();
  });
});

describe("isHoliday", () => {
  const holidays = [CHRISTMAS, LABOUR_DAY];

  it("returns true for a holiday date", () => {
    expect(isHoliday(new Date(2026, 11, 25), holidays, 2026)).toBe(true);
  });

  it("returns false for a non-holiday date", () => {
    expect(isHoliday(new Date(2026, 11, 24), holidays, 2026)).toBe(false);
  });

  it("skips inactive holidays", () => {
    expect(isHoliday(new Date(2026, 0, 1), [INACTIVE], 2026)).toBe(false);
  });
});

describe("countBusinessDays", () => {
  it("counts weekdays between two dates", () => {
    // Mon 2026-01-05 to Fri 2026-01-09 = 4 business days (Tue-Fri)
    const count = countBusinessDays(new Date(2026, 0, 5), new Date(2026, 0, 9), []);
    expect(count).toBe(4);
  });

  it("excludes weekends", () => {
    // Mon 2026-01-05 to Mon 2026-01-12 = 5 business days
    const count = countBusinessDays(new Date(2026, 0, 5), new Date(2026, 0, 12), []);
    expect(count).toBe(5);
  });

  it("excludes holidays", () => {
    // If Christmas 2026 (Fri Dec 25) is in range
    // Mon Dec 21 to Fri Dec 26 = 5 weekdays minus 1 holiday = 4
    const count = countBusinessDays(new Date(2026, 11, 21), new Date(2026, 11, 26), [CHRISTMAS]);
    expect(count).toBe(4);
  });

  it("returns 0 for same day", () => {
    const count = countBusinessDays(new Date(2026, 0, 5), new Date(2026, 0, 5), []);
    expect(count).toBe(0);
  });
});

describe("addBusinessDays", () => {
  it("adds business days skipping weekends", () => {
    // Fri 2026-01-02, add 3 business days = Wed 2026-01-07
    const result = addBusinessDays(new Date(2026, 0, 2), 3, []);
    expect(result.getDate()).toBe(7);
    expect(result.getMonth()).toBe(0);
  });

  it("skips holidays when adding", () => {
    // If Christmas 2026 is Fri Dec 25
    // Wed Dec 23, add 2 business days = Mon Dec 28 (skip Dec 25)
    const result = addBusinessDays(new Date(2026, 11, 23), 2, [CHRISTMAS]);
    expect(result.getDate()).toBe(28);
  });

  it("returns same date for 0 days", () => {
    const start = new Date(2026, 0, 5);
    const result = addBusinessDays(start, 0, []);
    expect(result.getDate()).toBe(5);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/business-days.test.ts
```
Expected: FAIL — module not found.

---

### Task 6: Business Days Utility — Implementation

**Files:**
- Create: `src/lib/business-days.ts`

**Step 1: Write implementation**

Create `src/lib/business-days.ts`:

```typescript
export interface HolidayDefinition {
  name: string;
  month: number;       // 1-12
  day: number | null;  // day of month for FIXED holidays
  dayOfWeek: number | null;  // 1=Sunday, 2=Monday, ... 7=Saturday (VFP convention)
  occurrence: number | null; // Nth occurrence (1st, 2nd, etc.)
  holidayType: "FIXED" | "FLOATING" | "EASTER";
  isActive: boolean;
}

/** Shift a weekend date to nearest weekday: Saturday→Friday, Sunday→Monday */
export function applyWeekendShift(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay(); // 0=Sun, 6=Sat
  if (dow === 6) {
    d.setDate(d.getDate() - 1); // Saturday → Friday
  } else if (dow === 0) {
    d.setDate(d.getDate() + 1); // Sunday → Monday
  }
  return d;
}

/** Resolve a holiday definition to its actual date for a given year. Returns null if inactive. */
export function resolveHolidayDate(holiday: HolidayDefinition, year: number): Date | null {
  if (!holiday.isActive) return null;

  if (holiday.holidayType === "FIXED" && holiday.day != null) {
    const date = new Date(year, holiday.month - 1, holiday.day);
    return applyWeekendShift(date);
  }

  if (holiday.holidayType === "FLOATING" && holiday.dayOfWeek != null && holiday.occurrence != null) {
    // Convert VFP dayOfWeek (1=Sun, 2=Mon, ..., 7=Sat) to JS (0=Sun, 1=Mon, ..., 6=Sat)
    const targetDow = holiday.dayOfWeek - 1;

    // Find Nth occurrence of target weekday in the month
    const firstOfMonth = new Date(year, holiday.month - 1, 1);
    let count = 0;
    const d = new Date(firstOfMonth);

    for (let i = 0; i < 35; i++) {
      if (d.getDay() === targetDow) {
        count++;
        if (count === holiday.occurrence) {
          return new Date(d);
        }
      }
      d.setDate(d.getDate() + 1);
    }
  }

  // EASTER type holidays are seeded manually per year — resolve as FIXED
  if (holiday.holidayType === "EASTER" && holiday.day != null) {
    const date = new Date(year, holiday.month - 1, holiday.day);
    return applyWeekendShift(date);
  }

  return null;
}

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isWeekend(date: Date): boolean {
  const dow = date.getDay();
  return dow === 0 || dow === 6;
}

/** Check if a date is a holiday. Pass the year to resolve floating holidays. */
export function isHoliday(date: Date, holidays: HolidayDefinition[], year?: number): boolean {
  const resolveYear = year ?? date.getFullYear();
  for (const h of holidays) {
    const resolved = resolveHolidayDate(h, resolveYear);
    if (resolved && isSameDate(date, resolved)) {
      return true;
    }
  }
  return false;
}

/** Count business days between startDate (exclusive) and endDate (inclusive). */
export function countBusinessDays(startDate: Date, endDate: Date, holidays: HolidayDefinition[]): number {
  let count = 0;
  const current = new Date(startDate);
  current.setDate(current.getDate() + 1); // start from day after startDate

  while (current <= endDate) {
    if (!isWeekend(current) && !isHoliday(current, holidays)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/** Add N business days to a date, skipping weekends and holidays. */
export function addBusinessDays(startDate: Date, days: number, holidays: HolidayDefinition[]): Date {
  if (days === 0) return new Date(startDate);

  const current = new Date(startDate);
  let added = 0;

  while (added < days) {
    current.setDate(current.getDate() + 1);
    if (!isWeekend(current) && !isHoliday(current, holidays)) {
      added++;
    }
  }

  return current;
}
```

**Step 2: Run tests**

```bash
npx vitest run src/lib/business-days.test.ts
```
Expected: All 14 tests pass.

**Step 3: Run full suite**

```bash
npx vitest run
```
Expected: All tests pass (731 + 14 = 745).

**Step 4: Commit**

```bash
git add src/lib/business-days.ts src/lib/business-days.test.ts
git commit -m "feat: add holiday-aware business day utilities with tests"
```

---

### Task 7: Refactor Product API — Use Shared Pricing

**Files:**
- Modify: `src/app/api/products/[id]/route.ts`

**Step 1: Refactor the PATCH handler**

In `src/app/api/products/[id]/route.ts`, add import at top:

```typescript
import { calculateDrtMarkup, calculateFittingPrice3 } from "@/lib/pricing";
```

Replace the inline DRT math (lines ~83-88):

```typescript
    // Auto-calculate DRT selling prices
    if (data.drtCostLower != null) {
      data.drtSellingLower = Math.round(data.drtCostLower * 1.3 * 100) / 100;
    }
    if (data.drtCostHigher != null) {
      data.drtSellingHigher = Math.round(data.drtCostHigher * 1.3 * 100) / 100;
    }
```

With:

```typescript
    // Auto-calculate DRT selling prices
    if (data.drtCostLower != null) {
      data.drtSellingLower = calculateDrtMarkup(data.drtCostLower);
    }
    if (data.drtCostHigher != null) {
      data.drtSellingHigher = calculateDrtMarkup(data.drtCostHigher);
    }
```

Replace the inline fitting math (line ~98):

```typescript
        data.coatingPrice3 = Math.round(cp1 * 1.1 * 100) / 100;
```

With:

```typescript
        data.coatingPrice3 = calculateFittingPrice3(cp1);
```

**Step 2: Run existing product tests**

```bash
npx vitest run src/app/api/products/[id]/route.test.ts
```
Expected: All existing tests still pass (no behavior change).

**Step 3: Run full suite**

```bash
npx vitest run
```
Expected: All 745 tests pass.

**Step 4: Commit**

```bash
git add src/app/api/products/[id]/route.ts
git commit -m "refactor: use shared pricing utilities in product API"
```

---

### Task 8: Refactor Order Detail APIs — Use Shared Pricing and GST

**Files:**
- Modify: `src/app/api/orders/[id]/details/route.ts`
- Modify: `src/app/api/orders/[id]/details/[detailId]/route.ts`

**Step 1: Refactor `src/app/api/orders/[id]/details/route.ts`**

Add imports at top:

```typescript
import { calculateLineTotal } from "@/lib/pricing";
import { calculateGst } from "@/lib/gst";
```

Replace `recalculateOrderTotals` function's GST line:

```typescript
  const gstAmount = parseFloat((orderTotal * gstRate / 100).toFixed(2));
```

With:

```typescript
  const gstAmount = calculateGst(orderTotal, gstRate);
```

Replace inline line total calculation (line ~99):

```typescript
  const lineTotal = Math.round(quantity * unitPrice * 100) / 100;
```

With:

```typescript
  const lineTotal = calculateLineTotal(quantity, unitPrice);
```

**Step 2: Refactor `src/app/api/orders/[id]/details/[detailId]/route.ts`**

Add imports at top:

```typescript
import { calculateLineTotal } from "@/lib/pricing";
import { calculateGst } from "@/lib/gst";
```

Replace `recalculateOrderTotals` function's GST line:

```typescript
  const gstAmount = parseFloat((orderTotal * gstRate / 100).toFixed(2));
```

With:

```typescript
  const gstAmount = calculateGst(orderTotal, gstRate);
```

Replace inline line total in PUT handler (line ~63):

```typescript
  const lineTotal = Math.round(quantity * unitPrice * 100) / 100;
```

With:

```typescript
  const lineTotal = calculateLineTotal(quantity, unitPrice);
```

**Step 3: Run existing order detail tests**

```bash
npx vitest run src/app/api/orders/[id]/details/route.test.ts src/app/api/orders/[id]/details/[detailId]/route.test.ts
```
Expected: All existing tests pass.

**Step 4: Run full suite**

```bash
npx vitest run
```
Expected: All 745 tests pass.

**Step 5: Commit**

```bash
git add "src/app/api/orders/[id]/details/route.ts" "src/app/api/orders/[id]/details/[detailId]/route.ts"
git commit -m "refactor: use shared pricing and GST utilities in order detail APIs"
```

---

### Task 9: Refactor Invoice Draft API — Use Shared GST

**Files:**
- Modify: `src/app/api/invoices/[id]/draft/route.ts`

**Step 1: Refactor the POST handler**

Add import at top:

```typescript
import { lookupGstRate, calculateGst } from "@/lib/gst";
```

Replace the inline GST lookup + calculation (lines ~57-70):

```typescript
  // Lookup GST rate by order date
  const taxRate = await prisma.taxRate.findFirst({
    where: {
      taxId: "GST",
      effectiveDate: { lte: order.orderDate },
      expiryDate: { gte: order.orderDate },
    },
  });

  const gstRate = taxRate ? Number(taxRate.rate) : 0;
  const orderTotal = Number(order.orderTotal);
  const gstAmount =
    validation.data.gstOverride !== undefined
      ? validation.data.gstOverride
      : Math.round(orderTotal * (gstRate / 100) * 100) / 100;
```

With:

```typescript
  // Lookup GST rate by order date
  const gstRate = (await lookupGstRate(order.orderDate)) ?? 0;
  const orderTotal = Number(order.orderTotal);
  const gstAmount =
    validation.data.gstOverride !== undefined
      ? validation.data.gstOverride
      : calculateGst(orderTotal, gstRate);
```

**Step 2: Run existing invoice tests**

```bash
npx vitest run src/app/api/invoices/[id]/draft/route.test.ts
```
Expected: All existing tests pass.

**Step 3: Run full suite**

```bash
npx vitest run
```
Expected: All 745 tests pass.

**Step 4: Commit**

```bash
git add src/app/api/invoices/[id]/draft/route.ts
git commit -m "refactor: use shared GST utilities in invoice draft API"
```

---

### Task 10: Holiday Seed Data

**Files:**
- Modify: `prisma/seed.ts`

**Step 1: Add holiday seed data**

At the end of the `main()` function in `prisma/seed.ts`, before the closing brace, add:

```typescript
  // Seed Canadian statutory holidays
  const holidays = [
    { name: "New Year's Day", month: 1, day: 1, dayOfWeek: null, occurrence: null, holidayType: "FIXED" as const },
    { name: "Family Day", month: 2, day: null, dayOfWeek: 2, occurrence: 3, holidayType: "FLOATING" as const },
    { name: "Good Friday 2026", month: 4, day: 3, dayOfWeek: null, occurrence: null, holidayType: "EASTER" as const },
    { name: "Victoria Day", month: 5, day: null, dayOfWeek: 2, occurrence: 3, holidayType: "FLOATING" as const },
    { name: "Canada Day", month: 7, day: 1, dayOfWeek: null, occurrence: null, holidayType: "FIXED" as const },
    { name: "Labour Day", month: 9, day: null, dayOfWeek: 2, occurrence: 1, holidayType: "FLOATING" as const },
    { name: "Thanksgiving", month: 10, day: null, dayOfWeek: 2, occurrence: 2, holidayType: "FLOATING" as const },
    { name: "Remembrance Day", month: 11, day: 11, dayOfWeek: null, occurrence: null, holidayType: "FIXED" as const },
    { name: "Christmas Day", month: 12, day: 25, dayOfWeek: null, occurrence: null, holidayType: "FIXED" as const },
    { name: "Boxing Day", month: 12, day: 26, dayOfWeek: null, occurrence: null, holidayType: "FIXED" as const },
  ];

  for (const h of holidays) {
    await prisma.holiday.upsert({
      where: { id: h.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") },
      update: {},
      create: {
        name: h.name,
        month: h.month,
        day: h.day,
        dayOfWeek: h.dayOfWeek,
        occurrence: h.occurrence,
        holidayType: h.holidayType,
        isActive: true,
      },
    });
  }

  console.log(`Seeded ${holidays.length} holidays`);

  // Seed GST tax rates (historical)
  const taxRates = [
    { taxId: "GST", effectiveDate: new Date("2000-01-01"), expiryDate: new Date("2007-12-31"), rate: 7 },
    { taxId: "GST", effectiveDate: new Date("2008-01-01"), expiryDate: new Date("2099-12-31"), rate: 5 },
  ];

  for (const tr of taxRates) {
    await prisma.taxRate.upsert({
      where: { id: `${tr.taxId}-${tr.effectiveDate.toISOString().split("T")[0]}` },
      update: {},
      create: tr,
    });
  }

  console.log(`Seeded ${taxRates.length} tax rates`);
```

**Note:** The `upsert` uses a derived id string for idempotency. The Holiday model uses `@id @default(cuid())`, so we need to provide explicit IDs for upserts. Alternatively, use `deleteMany` + `createMany` if upsert by name is cleaner — the subagent should check the Holiday model's unique constraints and adjust accordingly.

**Step 2: Run full test suite**

```bash
npx vitest run
```
Expected: All 745 tests pass (seed file changes don't affect tests).

**Step 3: Verify build**

```bash
npx next build
```
Expected: Build passes.

**Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: add Canadian holiday and GST tax rate seed data"
```
