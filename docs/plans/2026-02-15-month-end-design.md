# Month-End Processing Module Design

## Goal

Build the month-end processing module for the Impreglon ERP, implementing WIP accrual snapshots with manual percent-complete adjustments, period management, and CSV export.

## Decisions

| Decision | Choice | Backlog Alternative |
|----------|--------|---------------------|
| Period locking | Snapshots only (no enforcement) | #42 — Financial period locking |
| Export format | CSV download | #43 — Excel (.xlsx) export |
| Percent-complete | 25% increments (0/25/50/75/100) | #44 — Freeform 0-100% |
| Workflow validation | VFP parity | #45 — Review with Impreglon staff |

## Data Model

### Existing Schema (already in place)

- `MonthEndSnapshot` model: orderId, orderNo, customerId, companyName, orderTotal, percentComplete, accrual, reportMonth, reportYear
- Unique constraint on `[orderId, reportMonth, reportYear]`
- Index on `[reportYear, reportMonth]`

### Permissions (existing)

- `monthend` — already in seed data, gates all month-end operations

## Business Logic

### Seeding (POST)

- Query orders with in-progress statuses (IN_PROGRESS, REWORK, and other active manufacturing statuses)
- For each order, create a MonthEndSnapshot with denormalized customer info, order total, 0% complete, $0 accrual
- Reject if snapshots already exist for that period (must delete first)

### Percent-Complete Update (PATCH)

- Accept value: 0, 25, 50, 75, or 100
- Auto-calculate: accrual = orderTotal * percentComplete / 100
- Round to 2 decimal places

### CSV Export

- Headers: Order #, Customer #, Company, Order Total, % Complete, Accrual, Month, Year
- Content-Disposition header for file download

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/month-end` | GET | List periods with summary totals |
| `/api/month-end/[year]/[month]` | GET | Get snapshot rows for a period |
| `/api/month-end/[year]/[month]` | POST | Seed snapshots from in-progress orders |
| `/api/month-end/[year]/[month]` | DELETE | Delete all snapshots for a period |
| `/api/month-end/[year]/[month]/[id]` | PATCH | Update percent-complete, auto-calc accrual |
| `/api/month-end/[year]/[month]/export` | GET | Download CSV |

## UI

### /month-end — Period List Page

- Table of past periods: Month/Year, # Orders, Total Value, Total Accruals
- "New Period" button with month/year selector
- Click row navigates to detail

### /month-end/[year]/[month] — Period Detail Page

- Summary cards: Total Orders, Total Value, Total Accruals, Avg % Complete
- Editable table: Order #, Customer, Order Total, % Complete (dropdown), Accrual (read-only)
- Inline percent-complete updates via PATCH
- Export CSV and Delete Period action buttons

### Sidebar

- "Month End" nav item already exists at `/month-end` with `Calendar` icon
