export interface HolidayDefinition {
  name: string;
  month: number;
  day: number | null;
  dayOfWeek: number | null;
  occurrence: number | null;
  holidayType: "FIXED" | "FLOATING" | "EASTER";
  isActive: boolean;
}

/** Shift a weekend date to nearest weekday: Saturday->Friday, Sunday->Monday */
export function applyWeekendShift(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay();
  if (dow === 6) {
    d.setDate(d.getDate() - 1);
  } else if (dow === 0) {
    d.setDate(d.getDate() + 1);
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
    const targetDow = holiday.dayOfWeek - 1;
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

/** Check if a date is a holiday. */
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
  current.setDate(current.getDate() + 1);

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
