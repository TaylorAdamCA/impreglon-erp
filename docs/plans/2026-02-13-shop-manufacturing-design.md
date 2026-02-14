# Shop/Manufacturing Module Design

## Overview

The shop module handles the physical manufacturing process: receiving incoming items, tracking them through process control steps, and shipping finished goods. Shop workers access the same app as office staff but see only shop-relevant pages based on role permissions.

## Scope (Issue #10)

- Receiving: confirm receipt of line items per order
- Process Control: assign templates, workers check off manufacturing steps
- Shipping: transition READY_TO_SHIP orders to SHIPPED with ship date

Out of scope (separate issues):
- Enhanced VFP-style receiving with valve detail entry (Issue #25)
- Freeform process steps per order (Issue #26)
- Enhanced shipping with carrier/tracking/packages (Issue #27)
- QA and Rework tracking (Issue #11)

## Pages

- **`/shop`** — Shop dashboard showing IN_PROGRESS and READY_TO_SHIP orders. Filterable by status.
- **`/shop/[id]`** — Shop order view with three sections: Receiving, Process Control, Ship.
- **`/admin/process-templates`** — Admin CRUD for process templates and their steps.

## Schema Changes

### New field on OrderDetail

- `receivedAt` (DateTime?) — null = not received, populated = received with timestamp

### New model: OrderProcessStep

Tracks actual step completion per order. Created as a snapshot when a template is assigned (so editing the template later doesn't affect in-flight orders).

```
OrderProcessStep {
  id              String    @id @default(cuid())
  orderId         String
  templateStepId  String
  stepNumber      Int
  operationName   String
  completedAt     DateTime?
  completedById   String?
  notes           String?

  order       Order @relation(...)
  completedBy User? @relation(...)
}
```

### Existing fields used

- `Order.processTemplate` (String?) — stores assigned template ID
- `Order.shipDate` (DateTime?) — set when order is shipped
- `Order.status` — IN_PROGRESS, READY_TO_SHIP, SHIPPED transitions

## API Routes

### Shop Operations

- **`PATCH /api/shop/orders/[id]/receive`** — Toggle receipt of a line item
  - Body: `{ detailId: string, received: boolean }`
  - Sets/clears `receivedAt` on OrderDetail
  - Requires `SHOP_RECEIVE` permission

- **`PATCH /api/shop/orders/[id]/process`** — Complete/uncomplete a process step
  - Body: `{ stepId: string, completed: boolean, notes?: string }`
  - Enforces sequential order (can't skip steps)
  - Requires `SHOP_PROCESS` permission

- **`PATCH /api/shop/orders/[id]/ship`** — Ship an order
  - Body: `{ notes?: string }`
  - Validates READY_TO_SHIP status
  - Sets shipDate, transitions to SHIPPED, records history
  - Requires `SHOP_SHIP` permission

- **`POST /api/shop/orders/[id]/assign-template`** — Assign process template to order
  - Body: `{ templateId: string }`
  - Creates OrderProcessStep rows from template steps
  - Stores template ID on order

### Admin: Process Templates

- `GET /api/admin/process-templates` — List all templates
- `POST /api/admin/process-templates` — Create template with steps
- `GET /api/admin/process-templates/[id]` — Get template with steps
- `PUT /api/admin/process-templates/[id]` — Update template and steps
- `DELETE /api/admin/process-templates/[id]` — Soft delete (set inactive)
- All require `PROCESS_TEMPLATES_MANAGE` permission

## Receiving Flow

1. Order is IN_PROGRESS, shop worker opens `/shop/[id]`
2. Line items shown with "Received" toggle per row
3. Worker clicks to confirm receipt — sets `receivedAt` timestamp
4. Progress indicator: "3 of 5 items received"
5. Receiving is informational — does not gate process control or shipping

## Process Control Flow

1. Admin assigns a process template to the order (dropdown on order header)
2. System creates OrderProcessStep rows (snapshot of template steps)
3. Workers check off steps sequentially — each records who/when/notes
4. When all steps complete, "Mark Ready to Ship" button appears
5. Transitions order to READY_TO_SHIP

## Shipping Flow

1. Order is READY_TO_SHIP
2. Worker clicks "Ship Order" — confirmation dialog with optional notes
3. Sets shipDate, transitions to SHIPPED, records OrderStatusHistory
4. Order moves to "Shipped" filter on shop dashboard

## Permissions

| Permission | Description | Default Role |
|-----------|-------------|-------------|
| `SHOP_RECEIVE` | Confirm receipt of items | ADMIN |
| `SHOP_PROCESS` | Complete process control steps | ADMIN |
| `SHOP_SHIP` | Ship orders | ADMIN |
| `PROCESS_TEMPLATES_MANAGE` | Create/edit process templates | ADMIN |

## Sidebar Changes

- "Shop" nav item visible when user has any `SHOP_*` permission
- "Process Templates" under "Admin" section, visible with `PROCESS_TEMPLATES_MANAGE`
- Pages redirect to dashboard if user lacks required permission
