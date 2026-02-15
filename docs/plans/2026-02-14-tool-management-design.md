# Tool Management Module Design

## Goal

Build the tool management module for the Impreglon ERP, implementing full CRUD for proprietary and standard tools, parts tracking, order assignments from both sides, and a receiving workflow with receipt history.

## Decisions

| Decision | Choice | Backlog Alternative |
|----------|--------|---------------------|
| Price book | Price field on tool record | #40 — Versioned tool price book |
| Receiving | Included (status + receipt log) | — |
| Permissions | 4 granular codes (VFP parity) | — |
| Assignment UI | Both tool detail + order detail pages | — |
| Retirement | Status change to RETIRED (visible) | — |

## Data Model

### Existing Schema (already in place)

- `Tool` model: toolNo, description, toolType, status, price, owner, location, isProprietary
- `ToolPart` model: partNo, description, price, quantity (cascade delete with tool)
- `ToolAssignment` model: toolId, orderId, assignment
- `ToolStatus` enum: `ACTIVE`, `RECEIVED`, `IN_USE`, `RETIRED`

### New Model

```prisma
model ToolReceipt {
  id         String   @id @default(cuid())
  toolId     String
  receivedBy String
  receivedAt DateTime @default(now())
  condition  String?
  notes      String?  @db.Text

  tool Tool @relation(fields: [toolId], references: [id])

  @@index([toolId])
  @@map("tool_receipts")
}
```

### Permission Codes (new)

- `tool_create` — Create new tools and parts
- `tool_modify` — Edit tools, parts, and assignments
- `tool_view` — Read-only access to tools
- `tool_receive` — Record tool receipts

## Tool Lifecycle

```
(new) → ACTIVE → RECEIVED → IN_USE → ACTIVE (returned) → RETIRED
```

- Tools cycle between ACTIVE, RECEIVED, and IN_USE during normal operations
- RETIRED is terminal — retired tools cannot be assigned to orders

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/tools` | GET | List tools with search, status filter, pagination |
| `/api/tools` | POST | Create new tool (auto-increment toolNo) |
| `/api/tools/[id]` | GET | Get tool with parts, assignments, receipts |
| `/api/tools/[id]` | PUT | Update tool details |
| `/api/tools/[id]` | PATCH | Change tool status (including retire) |
| `/api/tools/[id]/parts` | GET | List parts for a tool |
| `/api/tools/[id]/parts` | POST | Add a part |
| `/api/tools/[id]/parts/[partId]` | PUT | Update a part |
| `/api/tools/[id]/parts/[partId]` | DELETE | Remove a part |
| `/api/tools/[id]/assignments` | POST | Assign tool to an order |
| `/api/tools/[id]/assignments/[assignmentId]` | DELETE | Remove assignment |
| `/api/tools/[id]/receive` | POST | Record tool receipt |
| `/api/orders/[id]/tools` | GET | List tools assigned to an order |
| `/api/orders/[id]/tools` | POST | Assign tool from order side |

## UI

### /tools — List Page

- Status filter buttons: All, Active, Received, In Use, Retired
- Search by tool number, description, owner
- Proprietary filter toggle (All / Proprietary only / Standard only)
- Paginated table: Tool #, Description, Type, Status, Owner, Location, Proprietary, Price
- Click row navigates to detail page
- "New Tool" button (requires `tool_create`)

### /tools/[id] — Detail Page

- Header: Tool #, description, type, status badge, proprietary badge, owner, location, price
- Edit mode (requires `tool_modify`): Inline edit of all fields
- Parts tab: Table with add/edit/delete (requires `tool_modify`)
- Assignments tab: Assigned orders with assign/remove, links to order detail
- Receipts tab: Receipt history with "Record Receipt" button (requires `tool_receive`)
- Status actions: Retire button, status change dropdown for ACTIVE/RECEIVED/IN_USE

### Order Detail Page Addition

- New "Tools" tab showing assigned tools with assign/remove capability

### Sidebar

- "Tools" nav item already exists at `/tools` with `Wrench` icon
