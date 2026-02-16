# Impreglon ERP

Modern re-creation of the Impreglon Coating Management System, originally built in Visual FoxPro 8.0. Full ERP covering orders, quotes, invoicing, shop floor manufacturing, QA/rework, tool management, and customer management for an industrial coating operation.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript 5 (strict mode) |
| Database | PostgreSQL 16 (Docker) |
| ORM | Prisma 6 |
| Auth | NextAuth v5 (beta) + bcryptjs |
| UI | shadcn/ui (New York) + Tailwind CSS 4 + Radix UI |
| Forms | React Hook Form + Zod validation |
| State | TanStack React Query v5 |
| Icons | Lucide React |
| Testing | Vitest 3.2 |

## Quick Start

### Prerequisites

- Node.js 20+
- Docker Desktop (for PostgreSQL)

### 1. Clone and install

```bash
git clone <repo-url>
cd impreglon-erp
npm install
```

### 2. Environment setup

```bash
cp .env.example .env
```

Default `.env` values:

```
DATABASE_URL="postgresql://impreglon:dev_password_change_me@localhost:5433/impreglon?schema=public"
NEXTAUTH_SECRET="change-this-to-a-random-secret-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Start the database

```bash
docker compose up -d
```

This starts PostgreSQL 16 on **port 5433** (not the default 5432, to avoid conflicts).

### 4. Run migrations and seed

```bash
npx prisma migrate dev    # Create tables
npm run db:seed            # Seed permissions, roles, admin user, holidays, tax rates, coating labels
```

### 5. (Optional) Import legacy VFP data

If you have the original FoxPro `.dbf` files:

```bash
npm run migrate:vfp
```

This imports ~18,000 records: customers, contacts, ship-to addresses, carriers, references, products, tools, tool parts, coating failures, method failures, and operations.

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with:

- **Username:** `admin`
- **Password:** `admin`

## All Commands

### npm scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server (localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:seed` | Seed the database (permissions, roles, admin user, holidays, tax rates, coating labels) |
| `npm run migrate:vfp` | Migrate legacy FoxPro data from `.dbf` files |

### Prisma commands

| Command | Description |
|---------|-------------|
| `npx prisma migrate dev` | Run pending migrations (creates tables) |
| `npx prisma migrate reset` | Drop all tables and re-run migrations + seed |
| `npx prisma generate` | Regenerate Prisma client after schema changes |
| `npx prisma studio` | Open database GUI at localhost:5555 |
| `npx prisma db push` | Push schema changes without creating a migration file |

### Docker commands

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start PostgreSQL |
| `docker compose down` | Stop PostgreSQL (data preserved in volume) |
| `docker compose down -v` | Stop PostgreSQL and delete all data |

## Database Browsing

The easiest way to inspect the database is **Prisma Studio**:

```bash
npx prisma studio
```

Opens a web GUI at [http://localhost:5555](http://localhost:5555) where you can browse all tables, filter, sort, and edit records. No additional tools needed.

Alternatively, connect any PostgreSQL client (pgAdmin, DBeaver, DataGrip) to `localhost:5433` with credentials from `.env`.

## Architecture

### Project Structure

```
src/
  app/
    (authenticated)/     # All protected pages (dashboard, orders, quotes, etc.)
    api/                 # API routes (REST endpoints)
    login/               # Public login page
  components/
    ui/                  # shadcn/ui base components
    customers/           # Customer-specific components
    quotes/              # Quote-specific components (add-item-dialog, etc.)
    orders/              # Order-specific components
    ...
  generated/
    prisma/              # Prisma client (auto-generated)
  lib/
    auth.ts              # NextAuth configuration
    prisma.ts            # Prisma client singleton
    permissions.ts       # Permission checking functions
    validations/         # Zod schemas for each domain
    business-days.ts     # Holiday-aware date calculations
  hooks/                 # React hooks
prisma/
  schema.prisma          # Database schema (29 models, 10 enums)
  seed.ts                # Seed data
  migrations/            # Migration files
scripts/
  vfp/                   # VFP migration mappers and reader
  migrate-vfp.ts         # Migration orchestrator
```

### Database Schema

**29 models** organized into domains:

| Domain | Models |
|--------|--------|
| Auth | User, Role, Permission, UserRole, Session |
| Customers | Customer, CustomerContact, ShipToAddress, Carrier, CustomerReference |
| Orders | Order, OrderDetail, OrderLock, OrderStatusHistory |
| Quotes | Quote, QuoteComponent, QuoteDetail |
| Products | ProductLibraryItem, CoatingPriceLabel |
| QA/Rework | Rework, ReworkMemo, CoatingFailure, MethodFailure |
| Tools | Tool, ToolPart, ToolAssignment, ToolReceipt |
| Process Control | ProcessTemplate, ProcessTemplateStep, OrderProcessStep |
| Financial | TaxRate, MonthEndSnapshot |
| Lookups | Holiday, Department, Operation |
| Vendors | Vendor, Purchase, PurchaseDetail |
| Audit | AuditLog |

## Authentication & Permissions

### Auth Flow

1. User logs in with username/password at `/login`
2. NextAuth validates credentials against `User` table (bcryptjs hash comparison)
3. JWT issued with user ID, username, and role
4. All routes under `(authenticated)/` are protected by layout middleware
5. API routes check `auth()` session before processing

### Role-Based Access Control

Users are assigned to **roles**, and roles have **permissions**. A user can have multiple roles; permissions are deduplicated across all assigned roles.

**Three seeded roles:**

| Role | Access Level |
|------|-------------|
| ADMIN | All 47 permissions |
| OFFICE | Orders, customers, libraries, financial |
| SHOP | Manufacturing/shop floor only |

### Permission Codes (47 total)

**Orders** (8):
`create`, `mod_rec_ord`, `mod_ip_ord`, `mod_fin_ord`, `del_ord`, `browse_ord`, `reset_ord`, `w_i_p`

**Manufacturing** (7):
`receive`, `quality`, `complete`, `shipping`, `sub_contract`, `p_plan`, `QA_MANAGE`

**Financial** (12):
`draft`, `approval`, `mod_invoice`, `final`, `accounting`, `invoice_draft`, `invoice_modify`, `invoice_approve`, `invoice_finalize`, `invoice_view`, `monthend`, `sales_journal`

**Tools** (8):
`prop_tools`, `create_tool`, `mod_tool`, `tool_rec_rpt`, `tool_create`, `tool_modify`, `tool_view`, `tool_receive`

**Customers** (5):
`cust_maint`, `contact_maint`, `cust_list`, `browse_cust`, `email_cust`

**Libraries** (2):
`update_lib`, `price_lists`

**Admin** (5):
`log_on`, `coattype_rpt`, `cust_sales`, `batch_rpts`, `PROCESS_TEMPLATES_MANAGE`

### How Permission Checks Work

Pages call `hasPermission(userId, code)` which:
1. Looks up all roles for the user via `UserRole` join table
2. Collects all permission codes from those roles
3. Returns `true` if the requested code is present

If the check fails, the page redirects to `/dashboard`.

```typescript
// Example: protecting a page
const session = await auth();
const canAccess = await hasPermission(session.user.id, "QA_MANAGE");
if (!canAccess) redirect("/dashboard");
```

## Business Flows

### Order Lifecycle

```
PENDING → IN_PROGRESS → REWORK (if QA fails) → READY_TO_SHIP → SHIPPED
  → DRAFT_INVOICE → INVOICE_APPROVED → FINAL_INVOICE → CLOSED
```

- Orders track status history (`OrderStatusHistory`)
- Optimistic locking via `OrderLock` prevents concurrent edits
- Each order has line items (`OrderDetail`) linked to product library items
- Process templates can be assigned for shop floor step tracking

### Quote Lifecycle

```
DRAFT → PENDING_APPROVAL → APPROVED → SENT → CONVERTED (to order) | EXPIRED
```

- Quotes have components (`QuoteComponent`) from product libraries
- Converting a quote creates an order with the same line items
- Each component references a coating price label and slot

### Product Libraries

Six library types, each with configurable coating price slots:

| Type | Price Slots | Coating Types |
|------|------------|---------------|
| ANSI Valve | 14 | I 222M, Nickel, Standard, Premium, DRT variants |
| Wellhead Valve | 6 | I 222M, Nickel, Calculated |
| Fitting | 3 | I 222M (Base/Tier 2), Nickel (Calculated) |
| Pup Joint | 5 | I 222M, Nickel, Calculated |
| Wellhead Component | 3 | I 222M, Nickel |
| Accessory | 1 | Standard flat price |

**Pricing rules:**
- Fittings `price3` = `price1 * 1.1` (10% calculated tier)
- DRT selling prices = base coating price * 1.3 (30% markup)
- DRT valve price increases are a flat $13 to Standard and Premium tiers

### QA / Rework Flow

1. Order enters QA inspection after manufacturing
2. Inspector passes or flags items
3. Flagged items get a rework plan (`ReworkMemo`)
4. Rework tracked through: `FLAGGED → PLAN_CREATED → IN_PROGRESS → RESOLVED`
5. Resolved items return to QA for re-inspection

### Invoice Flow

1. Order reaches shipping/completion
2. Draft invoice created
3. Invoice reviewed and approved
4. Invoice finalized (locks all fields)
5. Month-end snapshot captures financial data

### Tool Management

- Tools have parts (`ToolPart`) with individual pricing
- Tools assigned to orders (`ToolAssignment`)
- Tool receipts tracked (`ToolReceipt`)
- Status: `ACTIVE → RECEIVED → IN_USE → RETIRED`
- Proprietary tools require special permissions

## API Routes

All API routes are under `/api/` and require authentication (except `/api/auth`).

### Customers
- `GET/POST /api/customers` — List (with search/pagination) or create
- `GET/PUT/DELETE /api/customers/[id]` — Read, update, soft-delete
- `POST/GET /api/customers/[id]/contacts` — Manage contacts
- `POST/GET /api/customers/[id]/ship-to` — Ship-to addresses
- `POST/GET /api/customers/[id]/carriers` — Preferred carriers

### Orders
- `GET/POST /api/orders` — List or create
- `GET/PUT /api/orders/[id]` — Read or update
- `PUT /api/orders/[id]/status` — Change status
- `POST/GET /api/orders/[id]/details` — Line items

### Quotes
- `GET/POST /api/quotes` — List or create
- `GET/PUT /api/quotes/[id]` — Read or update
- `PUT /api/quotes/[id]/status` — Change status
- `POST /api/quotes/[id]/convert` — Convert to order
- `POST/GET /api/quotes/[id]/components` — Quote line items

### Products
- `GET/POST /api/products` — Library items (filtered by type)
- `GET/PUT /api/products/[id]` — Single item
- `POST /api/products/labels` — Upsert coating price labels

### QA / Rework
- `GET /api/qa/orders` — QA queue
- `POST /api/qa/orders/[id]/inspect` — Submit inspection
- `POST /api/qa/orders/[id]/rework-plans` — Create rework memo

### Shop Floor
- `POST /api/shop/orders/[id]/receive` — Receive components
- `POST /api/shop/orders/[id]/assign-template` — Assign process template
- `POST /api/shop/orders/[id]/process` — Complete process step
- `POST /api/shop/orders/[id]/ship` — Mark ready to ship

### Invoices
- `GET/POST /api/invoices` — List or create
- `POST /api/invoices/[id]/draft` — Create draft
- `POST /api/invoices/[id]/approve` — Approve
- `POST /api/invoices/[id]/finalize` — Finalize (locks)

### Tools
- `GET/POST /api/tools` — List or create
- `GET/PUT /api/tools/[id]` — Read or update
- `POST /api/tools/[id]/receive` — Record receipt
- `POST/GET /api/tools/[id]/parts` — Tool components
- `POST/GET /api/tools/[id]/assignments` — Order assignments

### Admin
- `GET/POST /api/admin/process-templates` — Process templates
- `GET/POST /api/admin/failure-types` — Coating/method failure codes
- `GET/POST /api/tax-rates` — Tax rate history

### Month-End
- `GET/POST /api/month-end/[year]/[month]` — Snapshots
- `POST /api/month-end/[year]/[month]/export` — Export

## Testing

Tests are colocated next to the files they test (e.g., `route.test.ts` next to `route.ts`).

```bash
npm run test           # Run all 790 tests once
npm run test:watch     # Watch mode
```

**Test structure:**
- Validation schema tests (`src/lib/validations/*.test.ts`)
- Permission function tests (`src/lib/permissions.test.ts`)
- API route tests (`src/app/api/**/*.test.ts`) — uses mocked Prisma + auth
- VFP mapper tests (`scripts/vfp/mappers/*.test.ts`)

**Mocking:**
- `src/lib/__mocks__/prisma.ts` — Deep-mocked PrismaClient
- `src/lib/__mocks__/auth.ts` — Mock session with test user
- `src/test-setup.ts` — Auto-mocks and reset between tests

## VFP Data Migration

The `migrate:vfp` script reads legacy FoxPro `.dbf` files and imports them into PostgreSQL.

```bash
npm run migrate:vfp
```

**What it imports:**

| Source | Records | Target |
|--------|---------|--------|
| Customers | ~338 | Customer |
| Contacts | ~635 | CustomerContact |
| Ship-to addresses | ~373 | ShipToAddress |
| Carriers | ~232 | Carrier |
| References | ~24 | CustomerReference |
| Products (6 library types) | ~2,662 | ProductLibraryItem |
| Tools | ~930 | Tool |
| Tool parts | ~12,737 | ToolPart |
| Coating failures | ~20 | CoatingFailure |
| Method failures | ~10 | MethodFailure |
| Operations | ~30 | Operation |

**Important:** The migration uses `readMode: "loose"` for VFP-version DBF files. VFP `CUSTNO` fields are strings (e.g., `"GUIBE"`) mapped to Prisma's auto-increment `custNo` integers via a `custCodeMap`.

## Seed Data

Running `npm run db:seed` creates:

- **47 permission codes** across 7 categories
- **3 roles** — ADMIN (all permissions), OFFICE, SHOP
- **1 admin user** — username: `admin`, password: `admin`
- **10 Canadian statutory holidays** (fixed + floating)
- **32 coating price labels** for all 6 library types
- **2 GST tax rates** (7% pre-2008, 5% post-2008)
