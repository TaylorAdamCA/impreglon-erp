# Business Logic Module Design

## Goal

Extract shared business logic into reusable utility modules — pricing calculations, GST, and holiday-aware business day math. Refactor existing inline logic to use shared utilities. Add missing DHT area-based pricing.

## Decisions

| Decision | Choice | Backlog Alternative |
|----------|--------|---------------------|
| Extraction approach | Extract and refactor existing routes | — |
| DHT pricing | Include (still used by Impreglon) | — |
| Holiday system | Canadian statutory holidays with seed data | — |
| Good Friday / Victoria Day | Simplified (seed entries, not auto-calculated) | #47 — Automatic Easter-based holiday calculation |
| Pricing constants | Named exports, easy to change | — |

## Shared Utility Modules

### `src/lib/pricing.ts` — Pricing Calculations

**Constants:**
- `DRT_MARKUP = 1.3`
- `FITTING_PRICE3_MARKUP = 1.1`
- `DHT_RATE = 0.67`
- `DHT_MIN_PRICE = 5.75`
- `DHT_PI = 3.14`

**Functions:**
- `calculateLineTotal(quantity, unitPrice)` → `Math.round(qty * price * 100) / 100`
- `calculateDrtMarkup(cost)` → `Math.round(cost * DRT_MARKUP * 100) / 100`
- `calculateFittingPrice3(coatingPrice1)` → `Math.round(price1 * FITTING_PRICE3_MARKUP * 100) / 100`
- `calculateDhtPrice(diameter, length)` → `Math.max(Math.round(diameter * length * DHT_PI * DHT_RATE * 100) / 100, DHT_MIN_PRICE)`

### `src/lib/gst.ts` — GST Calculation

**Functions:**
- `lookupGstRate(prisma, date)` → query TaxRate table for GST rate effective on given date, return rate or null
- `calculateGst(orderTotal, rate)` → `Math.round(total * rate / 100 * 100) / 100`

### `src/lib/business-days.ts` — Holiday-Aware Date Math

**Functions:**
- `resolveHolidayDate(holiday, year)` → resolve a holiday definition to its actual date for a given year (handles fixed dates, Nth weekday, last weekday)
- `applyWeekendShift(date)` → if Saturday → Friday, if Sunday → Monday
- `isHoliday(date, holidays)` → check if a date is a holiday
- `countBusinessDays(startDate, endDate, holidays)` → count weekdays excluding holidays
- `addBusinessDays(startDate, days, holidays)` → add N business days, skipping weekends and holidays

**Holiday types supported:**
- Fixed date (with weekend shifting): Christmas, New Year's, Canada Day, Remembrance Day, Boxing Day
- Nth weekday of month: Family Day (3rd Mon Feb), Labour Day (1st Mon Sep), Thanksgiving (2nd Mon Oct)
- Last weekday before date: Victoria Day (last Mon before May 25)
- Manually seeded: Good Friday (varies yearly)

## Routes to Refactor

| Route | Current Inline Logic | Replace With |
|-------|---------------------|--------------|
| `api/products/[id]` PATCH | `cost * 1.3`, `price1 * 1.1` | `calculateDrtMarkup()`, `calculateFittingPrice3()` |
| `api/orders/[id]/details` POST | `qty * unitPrice`, GST math | `calculateLineTotal()`, `calculateGst()` |
| `api/orders/[id]/details/[detailId]` PUT | same line total + recalculate | `calculateLineTotal()`, `calculateGst()` |
| `api/invoices/[id]/draft` POST | GST lookup + calculation | `lookupGstRate()`, `calculateGst()` |

## Holiday Seed Data

| Holiday | Type | Month | Day/Occurrence |
|---------|------|-------|----------------|
| New Year's Day | FIXED | 1 | day: 1 |
| Family Day | NTH_WEEKDAY | 2 | 3rd Monday |
| Good Friday | FIXED | varies | seeded per year |
| Victoria Day | LAST_WEEKDAY_BEFORE | 5 | last Monday before 25th |
| Canada Day | FIXED | 7 | day: 1 |
| Labour Day | NTH_WEEKDAY | 9 | 1st Monday |
| Thanksgiving | NTH_WEEKDAY | 10 | 2nd Monday |
| Remembrance Day | FIXED | 11 | day: 11 |
| Christmas Day | FIXED | 12 | day: 25 |
| Boxing Day | FIXED | 12 | day: 26 |
