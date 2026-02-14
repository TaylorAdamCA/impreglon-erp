# QA & Rework Tracking Module Design

## Overview

The QA module inspects manufactured items for quality compliance. Each line item on an order can have quantities pass inspection, be flagged for rework, or remain uninspected. When items fail QA, rework plans are created with failure classification, process templates, and tracking. Resolved rework items return to QA for re-inspection.

## Scope (Issue #11)

- QA inspection queue and per-order inspection page
- Pass/fail quantity tracking per line item with validation
- Rework flagging, plan creation, and item resolution
- Failure type classification (coating and method failures as DB lookup tables)
- Re-inspection after rework
- QA status section on shop order detail page
- Admin management for failure type lookups

Out of scope (separate issues):
- Granular QA permissions (Issue #31) — currently single QA_MANAGE permission
- Separate rework-specific templates (Issue #29) — currently reuses ProcessTemplate
- Department lookup table (Issue #30) — currently free text field

## Pages

- **`/qa`** — QA queue listing orders ready for inspection (IN_PROGRESS with all process steps complete) and orders in REWORK status. Filterable by status.
- **`/qa/[id]`** — QA inspection page for a specific order. Line item inspection, rework plan creation, rework resolution.
- **`/admin/failure-types`** — Admin CRUD for coating failure and method failure lookup tables.
- **`/shop/[id]`** — Existing page gets a read-only QA status section.

## Schema Changes

### New models: CoatingFailure and MethodFailure

Simple lookup tables for failure classification.

```
CoatingFailure {
  id          String  @id @default(cuid())
  code        String  @unique
  description String
  isActive    Boolean @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@map("coating_failures")
}

MethodFailure {
  id          String  @id @default(cuid())
  code        String  @unique
  description String
  isActive    Boolean @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@map("method_failures")
}
```

### Existing models used (no changes needed)

- `OrderDetail.currentPass` (Int) — items passing current inspection round
- `OrderDetail.passedQty` (Int) — total items that have passed QA
- `OrderDetail.reworkQty` (Int) — total items flagged for rework
- `Rework` — individual rework item records with status tracking
- `ReworkMemo` — rework plans with plan numbers, failure classification, process template
- `ReworkStatus` enum — FLAGGED, PLAN_CREATED, IN_PROGRESS, RESOLVED, RETURNED_TO_QA
- `OrderStatus.REWORK` — order-level rework status

## API Routes

### QA Inspection

- **`GET /api/qa/orders`** — List orders ready for QA inspection
  - Returns IN_PROGRESS orders with all process steps complete, plus REWORK orders
  - Includes customer, details with QA counts, rework items
  - Requires `QA_MANAGE` permission

- **`PATCH /api/qa/orders/[id]/inspect`** — Submit inspection for a line item
  - Body: `{ detailId: string, currentPass: number, reworkQty?: number }`
  - Validates: `currentPass + (reworkQty ?? 0) <= quantity - passedQty - reworkQty`
  - Updates passedQty, reworkQty on OrderDetail
  - Creates Rework record if reworkQty > 0 (status FLAGGED)
  - Requires `QA_MANAGE` permission

- **`PATCH /api/qa/orders/[id]/status`** — QA status transitions
  - Body: `{ action: "rework" | "pass" | "return" }`
  - `rework`: IN_PROGRESS → REWORK (validates rework items exist)
  - `pass`: IN_PROGRESS → READY_TO_SHIP (validates all items passed)
  - `return`: REWORK → IN_PROGRESS (validates all rework items resolved)
  - Records OrderStatusHistory
  - Requires `QA_MANAGE` permission

### Rework Management

- **`POST /api/qa/orders/[id]/rework-plans`** — Create rework plan
  - Body: `{ reworkId, productType, templateId?, qaNotes?, coatingFailure?, methodFailure?, operations?, department? }`
  - Creates ReworkMemo with auto-incremented planNo
  - Links Rework record, transitions status FLAGGED → PLAN_CREATED
  - Requires `QA_MANAGE` permission

- **`PATCH /api/qa/orders/[id]/rework/[reworkId]`** — Update rework item status
  - Body: `{ action: "start" | "resolve" }`
  - `start`: PLAN_CREATED → IN_PROGRESS
  - `resolve`: IN_PROGRESS → RESOLVED (sets resolved, resolvedAt)
  - Requires `QA_MANAGE` permission

### Admin: Failure Types

- **`GET /api/admin/failure-types`** — Returns both coating and method failure lists
- **`POST /api/admin/failure-types/[type]`** — Create failure type (type = "coating" or "method")
- **`PUT /api/admin/failure-types/[type]/[id]`** — Update failure type
- **`DELETE /api/admin/failure-types/[type]/[id]`** — Soft delete (set inactive)
- All require `QA_MANAGE` permission

## QA Inspection Flow

1. Order completes all process steps, appears in QA queue
2. Inspector opens `/qa/[id]`, sees line items with quantities
3. For each line item: enter currentPass (items passing), optionally flag rework quantity
4. Validation enforces: currentPass + reworkQty cannot exceed remaining uninspected
5. passedQty accumulates across inspection rounds
6. When all items on all lines pass (passedQty === quantity): "Mark Ready to Ship" button appears
7. If any items are flagged for rework: "Send to Rework" transitions order to REWORK status

## Rework Flow

1. Rework items appear in the rework section with status FLAGGED
2. Inspector creates a rework plan: product type, process template, QA notes, failure classification
3. Plan is assigned to rework item, status → PLAN_CREATED
4. Worker starts rework, status → IN_PROGRESS
5. Worker resolves rework item (checkbox), status → RESOLVED
6. When all rework items resolved: "Return to QA" transitions order back to IN_PROGRESS
7. Re-inspection: reworked quantities become available for inspection again

## Color Coding

| Style | Meaning |
|-------|---------|
| Normal | Items to inspect |
| Red/destructive accent | Rework flagged |
| Green/success accent | Fully passed |
| Muted/gray | Zero quantity |

## Permissions

| Permission | Description | Default Role |
|-----------|-------------|-------------|
| `QA_MANAGE` | All QA operations (inspect, rework, resolve) | ADMIN |

## Sidebar Changes

- "Quality" nav item visible to users with `QA_MANAGE` permission, links to `/qa`
- "Failure Types" under Admin section, visible with `QA_MANAGE` permission
