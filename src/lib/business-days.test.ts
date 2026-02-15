import { describe, it, expect } from "vitest";
import {
  resolveHolidayDate,
  applyWeekendShift,
  isHoliday,
  countBusinessDays,
  addBusinessDays,
} from "./business-days";

const CHRISTMAS = { name: "Christmas Day", month: 12, day: 25, dayOfWeek: null, occurrence: null, holidayType: "FIXED" as const, isActive: true };
const LABOUR_DAY = { name: "Labour Day", month: 9, day: null, dayOfWeek: 2, occurrence: 1, holidayType: "FLOATING" as const, isActive: true };
const THANKSGIVING = { name: "Thanksgiving", month: 10, day: null, dayOfWeek: 2, occurrence: 2, holidayType: "FLOATING" as const, isActive: true };
const INACTIVE = { name: "Inactive", month: 1, day: 1, dayOfWeek: null, occurrence: null, holidayType: "FIXED" as const, isActive: false };

describe("applyWeekendShift", () => {
  it("shifts Saturday to Friday", () => {
    // 2026-12-26 is Saturday
    const result = applyWeekendShift(new Date(2026, 11, 26));
    expect(result.getDate()).toBe(25);
  });

  it("shifts Sunday to Monday", () => {
    // 2027-01-03 is Sunday
    const result = applyWeekendShift(new Date(2027, 0, 3));
    expect(result.getDate()).toBe(4);
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
    expect(date?.getMonth()).toBe(11);
    expect(date?.getDate()).toBe(25);
  });

  it("resolves Nth weekday holiday (Labour Day = 1st Monday of September)", () => {
    const date = resolveHolidayDate(LABOUR_DAY, 2026);
    expect(date?.getMonth()).toBe(8);
    expect(date?.getDate()).toBe(7);
  });

  it("resolves 2nd weekday holiday (Thanksgiving = 2nd Monday of October)", () => {
    const date = resolveHolidayDate(THANKSGIVING, 2026);
    expect(date?.getMonth()).toBe(9);
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
    // Mon 2026-01-05 to Fri 2026-01-09 = 4 business days
    const count = countBusinessDays(new Date(2026, 0, 5), new Date(2026, 0, 9), []);
    expect(count).toBe(4);
  });

  it("excludes weekends", () => {
    // Mon 2026-01-05 to Mon 2026-01-12 = 5 business days
    const count = countBusinessDays(new Date(2026, 0, 5), new Date(2026, 0, 12), []);
    expect(count).toBe(5);
  });

  it("excludes holidays", () => {
    // Mon Dec 21 to Mon Dec 28 2026 = 5 weekdays (22,23,24,25,28) minus 1 holiday (Christmas Dec 25) = 4
    const count = countBusinessDays(new Date(2026, 11, 21), new Date(2026, 11, 28), [CHRISTMAS]);
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
    // Wed Dec 23 2026, add 2 business days = Mon Dec 28 (skip Christmas Dec 25)
    const result = addBusinessDays(new Date(2026, 11, 23), 2, [CHRISTMAS]);
    expect(result.getDate()).toBe(28);
  });

  it("returns same date for 0 days", () => {
    const start = new Date(2026, 0, 5);
    const result = addBusinessDays(start, 0, []);
    expect(result.getDate()).toBe(5);
  });
});
