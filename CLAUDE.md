# Impreglon ERP — Modern Re-creation

## Project Context

This is a modern re-creation of the **Impreglon Coating Management System**, originally built in Visual FoxPro 8.0. The original source lives at:
`C:\Users\Taylor\Desktop\Misc\From Old PC\Work\Impreglon\FoxPro`

Detailed workflow documentation (extracted from VFP source) is at:
`C:\Users\Taylor\Desktop\Misc\From Old PC\Work\Impreglon\FoxPro\docs\workflows\`
- `00-overview.md` — System overview and module map
- `01-authentication-routing.md` — Login, permission levels, menu routing
- `02-permission-system.md` — Role-based access control
- `03-quote-lifecycle.md` — Quote creation through approval/conversion
- `04-order-lifecycle.md` — Full order CRUD and status flow
- `05-shop-manufacturing.md` — Shop floor / manufacturing module
- `06-qa-rework.md` — Quality assurance and rework tracking
- `07-invoicing.md` — Invoice generation and approval
- `08-customer-management.md` — Customer, contacts, ship-to addresses
- `09-product-libraries.md` — Valves, fittings, pups, well components
- `10-tool-management.md` — Proprietary tool inventory
- `11-month-end.md` — Period-end processing and snapshots
- `12-data-integrity.md` — Locking, buffering, conflict detection

## Tech Stack

- **Framework:** Next.js 16 (App Router, React Server Components)
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL 16 (via Docker Compose)
- **ORM:** Prisma 6 (classic engine)
- **Auth:** NextAuth v5 (beta) + Prisma adapter + bcryptjs
- **UI:** shadcn/ui (New York style) + Tailwind CSS v4 + Radix UI
- **Forms:** React Hook Form + Zod validation
- **State:** TanStack React Query
- **Icons:** Lucide React

## Current Progress

### COMPLETED
- [x] Next.js 16 project scaffolded
- [x] All dependencies installed (see package.json)
- [x] Docker Compose for PostgreSQL 16
- [x] Environment config (.env.example)
- [x] Prisma schema — 29 models, 10 enums covering full ERP domain
- [x] shadcn/ui component library — 17 base components installed
- [x] Tailwind CSS v4 theming with custom CSS variables
- [x] prisma.config.ts configured
- [x] TypeScript + ESLint configured

### NOT YET STARTED
- [ ] Run `prisma migrate dev` to generate initial migration
- [ ] Set up NextAuth authentication (providers, callbacks, session handling)
- [ ] Create app layout (sidebar navigation, header, auth guard)
- [ ] Build login page
- [ ] Build dashboard page
- [ ] Implement API routes (CRUD for each domain)
- [ ] Build feature pages (orders, quotes, customers, etc.)
- [ ] Business logic (pricing calculations, holiday-aware dates, GST, etc.)
- [ ] Seed data / data migration from VFP DBF tables

## Verification Requirements

After every code change, run these checks before considering work complete:
- `npm test` — all tests must pass
- `npx next build` — build must succeed (once Prisma client is generated)

## Architecture Decisions

- Prisma client output: `src/generated/prisma`
- Component aliases: `@/components`, `@/lib`, `@/hooks`
- UI components at: `src/components/ui/`
- Database runs locally via Docker on port 5432

## How to Run

```bash
docker compose up -d          # Start PostgreSQL
npx prisma migrate dev        # Run migrations (not yet done)
npm run dev                   # Start Next.js dev server at localhost:3000
```
