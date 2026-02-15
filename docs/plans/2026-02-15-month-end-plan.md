# Month-End Processing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the month-end processing module with WIP accrual snapshots, manual percent-complete adjustments, and CSV export.

**Architecture:** Uses the existing `MonthEndSnapshot` Prisma model. API routes follow nested `[year]/[month]` pattern for period addressing. Single permission `monthend` gates all operations. No schema migration needed — model already exists.

**Tech Stack:** Next.js 16 App Router, Prisma 6, Zod validation, shadcn/ui, vitest

---

### Task 1: Add MonthEndSnapshot to Prisma Mock

**Files:**
- Modify: `src/lib/__mocks__/prisma.ts`

**Step 1: Add mock model**

In `src/lib/__mocks__/prisma.ts`, add to the prisma export object:

```typescript
monthEndSnapshot: createModelMock(),
```

**Step 2: Run tests to verify nothing broke**

```bash
npx vitest run
```
Expected: All 685 tests pass.

**Step 3: Commit**

```bash
git add src/lib/__mocks__/prisma.ts
git commit -m "feat: add monthEndSnapshot to prisma mock"
```

---

### Task 2: Validation Schemas

**Files:**
- Create: `src/lib/validations/month-end.ts`
- Create: `src/lib/validations/month-end.test.ts`

**Step 1: Write failing tests**

Create `src/lib/validations/month-end.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { seedPeriodSchema, updatePercentSchema } from "./month-end";

describe("seedPeriodSchema", () => {
  it("accepts valid month and year", () => {
    const result = seedPeriodSchema.safeParse({ month: 6, year: 2026 });
    expect(result.success).toBe(true);
  });

  it("rejects month below 1", () => {
    const result = seedPeriodSchema.safeParse({ month: 0, year: 2026 });
    expect(result.success).toBe(false);
  });

  it("rejects month above 12", () => {
    const result = seedPeriodSchema.safeParse({ month: 13, year: 2026 });
    expect(result.success).toBe(false);
  });

  it("rejects year below 2000", () => {
    const result = seedPeriodSchema.safeParse({ month: 1, year: 1999 });
    expect(result.success).toBe(false);
  });
});

describe("updatePercentSchema", () => {
  it("accepts valid 25% increment values", () => {
    for (const val of [0, 25, 50, 75, 100]) {
      const result = updatePercentSchema.safeParse({ percentComplete: val });
      expect(result.success).toBe(true);
    }
  });

  it("rejects non-increment values", () => {
    const result = updatePercentSchema.safeParse({ percentComplete: 30 });
    expect(result.success).toBe(false);
  });

  it("rejects negative values", () => {
    const result = updatePercentSchema.safeParse({ percentComplete: -25 });
    expect(result.success).toBe(false);
  });

  it("rejects values over 100", () => {
    const result = updatePercentSchema.safeParse({ percentComplete: 125 });
    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/validations/month-end.test.ts
```

**Step 3: Write implementation**

Create `src/lib/validations/month-end.ts`:

```typescript
import { z } from "zod";

export const PERCENT_COMPLETE_VALUES = [0, 25, 50, 75, 100] as const;

export const seedPeriodSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export type SeedPeriodValues = z.infer<typeof seedPeriodSchema>;

export const updatePercentSchema = z.object({
  percentComplete: z
    .number()
    .int()
    .refine((val) => PERCENT_COMPLETE_VALUES.includes(val as (typeof PERCENT_COMPLETE_VALUES)[number]), {
      message: "Percent complete must be 0, 25, 50, 75, or 100",
    }),
});

export type UpdatePercentValues = z.infer<typeof updatePercentSchema>;
```

**Step 4: Run tests**

```bash
npx vitest run src/lib/validations/month-end.test.ts
```
Expected: All 8 tests pass.

**Step 5: Commit**

```bash
git add src/lib/validations/month-end.ts src/lib/validations/month-end.test.ts
git commit -m "feat: add month-end validation schemas with tests"
```

---

### Task 3: Period List API — GET /api/month-end

**Files:**
- Create: `src/app/api/month-end/route.ts`
- Create: `src/app/api/month-end/route.test.ts`

**Step 1: Write failing tests**

Create `src/app/api/month-end/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
  getUserPermissions: vi.fn().mockResolvedValue([]),
}));
import { hasPermission } from "@/lib/permissions";
const mockHasPermission = vi.mocked(hasPermission);

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

import { GET } from "./route";

function makeRequest() {
  return new NextRequest(new URL("http://localhost:3000/api/month-end"));
}

describe("GET /api/month-end", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 403 without monthend permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it("returns grouped period summaries", async () => {
    mockPrisma.monthEndSnapshot.findMany.mockResolvedValueOnce([
      { reportYear: 2026, reportMonth: 1, orderTotal: 10000, accrual: 5000 },
      { reportYear: 2026, reportMonth: 1, orderTotal: 20000, accrual: 15000 },
      { reportYear: 2025, reportMonth: 12, orderTotal: 8000, accrual: 2000 },
    ] as never);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.periods).toHaveLength(2);
    expect(body.periods[0].year).toBe(2026);
    expect(body.periods[0].month).toBe(1);
    expect(body.periods[0].orderCount).toBe(2);
  });
});
```

**Step 2: Run tests to verify they fail**

**Step 3: Write implementation**

Create `src/app/api/month-end/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "monthend"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snapshots = await prisma.monthEndSnapshot.findMany({
    orderBy: [{ reportYear: "desc" }, { reportMonth: "desc" }],
  });

  // Group by year/month
  const periodMap = new Map<string, {
    year: number;
    month: number;
    orderCount: number;
    totalOrderValue: number;
    totalAccruals: number;
  }>();

  for (const s of snapshots) {
    const key = `${s.reportYear}-${s.reportMonth}`;
    const existing = periodMap.get(key);
    if (existing) {
      existing.orderCount++;
      existing.totalOrderValue += Number(s.orderTotal);
      existing.totalAccruals += Number(s.accrual);
    } else {
      periodMap.set(key, {
        year: s.reportYear,
        month: s.reportMonth,
        orderCount: 1,
        totalOrderValue: Number(s.orderTotal),
        totalAccruals: Number(s.accrual),
      });
    }
  }

  const periods = Array.from(periodMap.values());

  return NextResponse.json({ periods });
}
```

**Step 4: Run tests**

```bash
npx vitest run src/app/api/month-end/route.test.ts
```
Expected: All 3 tests pass.

**Step 5: Commit**

```bash
git add src/app/api/month-end/route.ts src/app/api/month-end/route.test.ts
git commit -m "feat: add month-end period list API with tests"
```

---

### Task 4: Period Detail & Seed API — GET/POST/DELETE /api/month-end/[year]/[month]

**Files:**
- Create: `src/app/api/month-end/[year]/[month]/route.ts`
- Create: `src/app/api/month-end/[year]/[month]/route.test.ts`

**Step 1: Write failing tests**

Create `src/app/api/month-end/[year]/[month]/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
  getUserPermissions: vi.fn().mockResolvedValue([]),
}));
import { hasPermission } from "@/lib/permissions";
const mockHasPermission = vi.mocked(hasPermission);

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

import { GET, POST, DELETE } from "./route";

const paramsPromise = Promise.resolve({ year: "2026", month: "1" });

describe("GET /api/month-end/[year]/[month]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = new NextRequest(new URL("http://localhost:3000/api/month-end/2026/1"));
    const res = await GET(req, { params: paramsPromise });
    expect(res.status).toBe(401);
  });

  it("returns snapshots for the period", async () => {
    mockPrisma.monthEndSnapshot.findMany.mockResolvedValueOnce([
      { id: "s1", orderNo: 100, companyName: "Acme", orderTotal: 10000, percentComplete: 50, accrual: 5000 },
    ] as never);

    const req = new NextRequest(new URL("http://localhost:3000/api/month-end/2026/1"));
    const res = await GET(req, { params: paramsPromise });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.snapshots).toHaveLength(1);
  });
});

describe("POST /api/month-end/[year]/[month]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 403 without monthend permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    const req = new NextRequest(new URL("http://localhost:3000/api/month-end/2026/1"), { method: "POST" });
    const res = await POST(req, { params: paramsPromise });
    expect(res.status).toBe(403);
  });

  it("returns 400 if snapshots already exist for period", async () => {
    mockPrisma.monthEndSnapshot.count.mockResolvedValueOnce(5);
    const req = new NextRequest(new URL("http://localhost:3000/api/month-end/2026/1"), { method: "POST" });
    const res = await POST(req, { params: paramsPromise });
    expect(res.status).toBe(400);
  });

  it("seeds snapshots from in-progress orders", async () => {
    mockPrisma.monthEndSnapshot.count.mockResolvedValueOnce(0);
    mockPrisma.order.findMany.mockResolvedValueOnce([
      {
        id: "ord-1",
        orderNo: 100,
        customerId: "cust-1",
        orderTotal: 10000,
        customer: { company: "Acme Corp" },
      },
    ] as never);
    mockPrisma.monthEndSnapshot.createMany.mockResolvedValueOnce({ count: 1 } as never);

    const req = new NextRequest(new URL("http://localhost:3000/api/month-end/2026/1"), { method: "POST" });
    const res = await POST(req, { params: paramsPromise });
    expect(res.status).toBe(201);

    expect(mockPrisma.monthEndSnapshot.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          orderId: "ord-1",
          orderNo: 100,
          customerId: "cust-1",
          companyName: "Acme Corp",
          percentComplete: 0,
          accrual: 0,
          reportMonth: 1,
          reportYear: 2026,
        }),
      ],
    });
  });

  it("returns empty result when no in-progress orders", async () => {
    mockPrisma.monthEndSnapshot.count.mockResolvedValueOnce(0);
    mockPrisma.order.findMany.mockResolvedValueOnce([]);
    mockPrisma.monthEndSnapshot.createMany.mockResolvedValueOnce({ count: 0 } as never);

    const req = new NextRequest(new URL("http://localhost:3000/api/month-end/2026/1"), { method: "POST" });
    const res = await POST(req, { params: paramsPromise });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.count).toBe(0);
  });
});

describe("DELETE /api/month-end/[year]/[month]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("deletes all snapshots for the period", async () => {
    mockPrisma.monthEndSnapshot.deleteMany.mockResolvedValueOnce({ count: 5 } as never);

    const req = new NextRequest(new URL("http://localhost:3000/api/month-end/2026/1"), { method: "DELETE" });
    const res = await DELETE(req, { params: paramsPromise });
    expect(res.status).toBe(200);

    expect(mockPrisma.monthEndSnapshot.deleteMany).toHaveBeenCalledWith({
      where: { reportMonth: 1, reportYear: 2026 },
    });
  });
});
```

**Step 2: Run tests to verify they fail**

**Step 3: Write implementation**

Create `src/app/api/month-end/[year]/[month]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import type { OrderStatus } from "@/generated/prisma/client";

const WIP_STATUSES: OrderStatus[] = ["IN_PROGRESS", "REWORK"];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "monthend"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { year, month } = await params;
  const reportYear = parseInt(year, 10);
  const reportMonth = parseInt(month, 10);

  const snapshots = await prisma.monthEndSnapshot.findMany({
    where: { reportYear, reportMonth },
    orderBy: { orderNo: "asc" },
  });

  return NextResponse.json({ snapshots, year: reportYear, month: reportMonth });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "monthend"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { year, month } = await params;
  const reportYear = parseInt(year, 10);
  const reportMonth = parseInt(month, 10);

  // Check if snapshots already exist
  const existing = await prisma.monthEndSnapshot.count({
    where: { reportYear, reportMonth },
  });

  if (existing > 0) {
    return NextResponse.json(
      { error: "Snapshots already exist for this period. Delete them first to re-seed." },
      { status: 400 }
    );
  }

  // Gather in-progress orders
  const orders = await prisma.order.findMany({
    where: { status: { in: WIP_STATUSES } },
    include: { customer: { select: { company: true } } },
  });

  const data = orders.map((order) => ({
    orderId: order.id,
    orderNo: order.orderNo,
    customerId: order.customerId,
    companyName: order.customer.company,
    orderTotal: Number(order.orderTotal),
    percentComplete: 0,
    accrual: 0,
    reportMonth,
    reportYear,
  }));

  const result = await prisma.monthEndSnapshot.createMany({ data });

  return NextResponse.json({ count: result.count }, { status: 201 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "monthend"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { year, month } = await params;
  const reportYear = parseInt(year, 10);
  const reportMonth = parseInt(month, 10);

  const result = await prisma.monthEndSnapshot.deleteMany({
    where: { reportMonth, reportYear },
  });

  return NextResponse.json({ deleted: result.count });
}
```

**Step 4: Run tests**

```bash
npx vitest run src/app/api/month-end/[year]/[month]/route.test.ts
```
Expected: All 6 tests pass.

**Step 5: Commit**

```bash
git add "src/app/api/month-end/[year]/[month]/route.ts" "src/app/api/month-end/[year]/[month]/route.test.ts"
git commit -m "feat: add month-end period detail, seed, and delete API with tests"
```

---

### Task 5: Percent-Complete Update API — PATCH /api/month-end/[year]/[month]/[id]

**Files:**
- Create: `src/app/api/month-end/[year]/[month]/[id]/route.ts`
- Create: `src/app/api/month-end/[year]/[month]/[id]/route.test.ts`

**Step 1: Write failing tests**

Create `src/app/api/month-end/[year]/[month]/[id]/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
  getUserPermissions: vi.fn().mockResolvedValue([]),
}));
import { hasPermission } from "@/lib/permissions";
const mockHasPermission = vi.mocked(hasPermission);

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

import { PATCH } from "./route";

const paramsPromise = Promise.resolve({ year: "2026", month: "1", id: "snap-1" });

function makeRequest(body: unknown) {
  return new NextRequest(
    new URL("http://localhost:3000/api/month-end/2026/1/snap-1"),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

describe("PATCH /api/month-end/[year]/[month]/[id]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest({ percentComplete: 50 }), { params: paramsPromise });
    expect(res.status).toBe(401);
  });

  it("returns 403 without monthend permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    const res = await PATCH(makeRequest({ percentComplete: 50 }), { params: paramsPromise });
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid percent value", async () => {
    const res = await PATCH(makeRequest({ percentComplete: 30 }), { params: paramsPromise });
    expect(res.status).toBe(400);
  });

  it("returns 404 when snapshot not found", async () => {
    mockPrisma.monthEndSnapshot.findUnique.mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest({ percentComplete: 50 }), { params: paramsPromise });
    expect(res.status).toBe(404);
  });

  it("updates percent-complete and auto-calculates accrual", async () => {
    mockPrisma.monthEndSnapshot.findUnique.mockResolvedValueOnce({
      id: "snap-1",
      orderTotal: 10000,
    } as never);
    mockPrisma.monthEndSnapshot.update.mockResolvedValueOnce({
      id: "snap-1",
      percentComplete: 75,
      accrual: 7500,
    } as never);

    const res = await PATCH(makeRequest({ percentComplete: 75 }), { params: paramsPromise });
    expect(res.status).toBe(200);

    expect(mockPrisma.monthEndSnapshot.update).toHaveBeenCalledWith({
      where: { id: "snap-1" },
      data: { percentComplete: 75, accrual: 7500 },
    });
  });

  it("calculates accrual correctly for 0%", async () => {
    mockPrisma.monthEndSnapshot.findUnique.mockResolvedValueOnce({
      id: "snap-1",
      orderTotal: 25000,
    } as never);
    mockPrisma.monthEndSnapshot.update.mockResolvedValueOnce({
      id: "snap-1",
      percentComplete: 0,
      accrual: 0,
    } as never);

    const res = await PATCH(makeRequest({ percentComplete: 0 }), { params: paramsPromise });
    expect(res.status).toBe(200);

    expect(mockPrisma.monthEndSnapshot.update).toHaveBeenCalledWith({
      where: { id: "snap-1" },
      data: { percentComplete: 0, accrual: 0 },
    });
  });
});
```

**Step 2: Run tests to verify they fail**

**Step 3: Write implementation**

Create `src/app/api/month-end/[year]/[month]/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { updatePercentSchema } from "@/lib/validations/month-end";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string; id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "monthend"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const result = updatePercentSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const snapshot = await prisma.monthEndSnapshot.findUnique({
    where: { id },
    select: { orderTotal: true },
  });

  if (!snapshot) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  const { percentComplete } = result.data;
  const accrual = Math.round(Number(snapshot.orderTotal) * percentComplete) / 100;

  const updated = await prisma.monthEndSnapshot.update({
    where: { id },
    data: { percentComplete, accrual },
  });

  return NextResponse.json(updated);
}
```

**Step 4: Run tests**

```bash
npx vitest run src/app/api/month-end/[year]/[month]/[id]/route.test.ts
```
Expected: All 6 tests pass.

**Step 5: Commit**

```bash
git add "src/app/api/month-end/[year]/[month]/[id]/"
git commit -m "feat: add percent-complete update API with auto-calculated accrual"
```

---

### Task 6: CSV Export API — GET /api/month-end/[year]/[month]/export

**Files:**
- Create: `src/app/api/month-end/[year]/[month]/export/route.ts`
- Create: `src/app/api/month-end/[year]/[month]/export/route.test.ts`

**Step 1: Write failing tests**

Create `src/app/api/month-end/[year]/[month]/export/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
  getUserPermissions: vi.fn().mockResolvedValue([]),
}));
import { hasPermission } from "@/lib/permissions";
const mockHasPermission = vi.mocked(hasPermission);

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

import { GET } from "./route";

const paramsPromise = Promise.resolve({ year: "2026", month: "1" });

describe("GET /api/month-end/[year]/[month]/export", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = new NextRequest(new URL("http://localhost:3000/api/month-end/2026/1/export"));
    const res = await GET(req, { params: paramsPromise });
    expect(res.status).toBe(401);
  });

  it("returns CSV with correct headers", async () => {
    mockPrisma.monthEndSnapshot.findMany.mockResolvedValueOnce([
      {
        orderNo: 100,
        customerId: "c1",
        companyName: "Acme Corp",
        orderTotal: 10000,
        percentComplete: 50,
        accrual: 5000,
        reportMonth: 1,
        reportYear: 2026,
      },
    ] as never);

    const req = new NextRequest(new URL("http://localhost:3000/api/month-end/2026/1/export"));
    const res = await GET(req, { params: paramsPromise });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv");
    expect(res.headers.get("content-disposition")).toContain("month-end-2026-01.csv");

    const text = await res.text();
    expect(text).toContain("Order #");
    expect(text).toContain("Acme Corp");
    expect(text).toContain("10000");
    expect(text).toContain("50");
    expect(text).toContain("5000");
  });

  it("returns empty CSV when no snapshots", async () => {
    mockPrisma.monthEndSnapshot.findMany.mockResolvedValueOnce([]);

    const req = new NextRequest(new URL("http://localhost:3000/api/month-end/2026/1/export"));
    const res = await GET(req, { params: paramsPromise });
    expect(res.status).toBe(200);
    const text = await res.text();
    const lines = text.trim().split("\n");
    expect(lines).toHaveLength(1); // header only
  });
});
```

**Step 2: Run tests to verify they fail**

**Step 3: Write implementation**

Create `src/app/api/month-end/[year]/[month]/export/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "monthend"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { year, month } = await params;
  const reportYear = parseInt(year, 10);
  const reportMonth = parseInt(month, 10);

  const snapshots = await prisma.monthEndSnapshot.findMany({
    where: { reportYear, reportMonth },
    orderBy: { orderNo: "asc" },
  });

  const header = "Order #,Customer #,Company,Order Total,% Complete,Accrual,Month,Year";
  const rows = snapshots.map((s) =>
    [
      s.orderNo,
      s.customerId,
      `"${s.companyName}"`,
      Number(s.orderTotal),
      s.percentComplete,
      Number(s.accrual),
      s.reportMonth,
      s.reportYear,
    ].join(",")
  );

  const csv = [header, ...rows].join("\n");
  const paddedMonth = String(reportMonth).padStart(2, "0");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="month-end-${reportYear}-${paddedMonth}.csv"`,
    },
  });
}
```

**Step 4: Run tests**

```bash
npx vitest run src/app/api/month-end/[year]/[month]/export/route.test.ts
```
Expected: All 3 tests pass.

**Step 5: Commit**

```bash
git add "src/app/api/month-end/[year]/[month]/export/"
git commit -m "feat: add month-end CSV export API with tests"
```

---

### Task 7: Month-End Period List Page

**Files:**
- Create: `src/app/(authenticated)/month-end/page.tsx`
- Create: `src/components/month-end/period-list.tsx`

**Reference:** Follow the tool list page pattern at `src/app/(authenticated)/tools/page.tsx` and `src/components/tools/tool-list.tsx`.

**Step 1: Create server page**

Create `src/app/(authenticated)/month-end/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { PeriodList } from "@/components/month-end/period-list";

export default async function MonthEndPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const canAccess = await hasPermission(session.user.id, "monthend");
  if (!canAccess) redirect("/dashboard");

  const snapshots = await prisma.monthEndSnapshot.findMany({
    orderBy: [{ reportYear: "desc" }, { reportMonth: "desc" }],
  });

  // Group by period
  const periodMap = new Map<string, {
    year: number;
    month: number;
    orderCount: number;
    totalOrderValue: number;
    totalAccruals: number;
  }>();

  for (const s of snapshots) {
    const key = `${s.reportYear}-${s.reportMonth}`;
    const existing = periodMap.get(key);
    if (existing) {
      existing.orderCount++;
      existing.totalOrderValue += Number(s.orderTotal);
      existing.totalAccruals += Number(s.accrual);
    } else {
      periodMap.set(key, {
        year: s.reportYear,
        month: s.reportMonth,
        orderCount: 1,
        totalOrderValue: Number(s.orderTotal),
        totalAccruals: Number(s.accrual),
      });
    }
  }

  const periods = Array.from(periodMap.values());

  return <PeriodList periods={periods} />;
}
```

**Step 2: Create client component**

Create `src/components/month-end/period-list.tsx`:

A "use client" component that shows:
- Heading "Month End Processing" with Calendar icon
- "New Period" button that opens a form with month (1-12 dropdown) and year (number input), calls POST `/api/month-end/[year]/[month]`, then router.refresh()
- Table of periods: Period (formatted as "January 2026"), # Orders, Total Order Value ($X.XX), Total Accruals ($X.XX)
- Click row navigates to `/month-end/[year]/[month]`
- Empty state: "No month-end periods processed yet."

Use month names array: `["January", "February", ..., "December"]` for display.

**Step 3: Verify build**

```bash
npx next build
```

**Step 4: Commit**

```bash
git add "src/app/(authenticated)/month-end/page.tsx" src/components/month-end/period-list.tsx
git commit -m "feat: add month-end period list page"
```

---

### Task 8: Month-End Period Detail Page

**Files:**
- Create: `src/app/(authenticated)/month-end/[year]/[month]/page.tsx`
- Create: `src/components/month-end/period-detail.tsx`

**Reference:** Follow the invoice detail page pattern for adaptive UI with cards and tables.

**Step 1: Create server page**

Create `src/app/(authenticated)/month-end/[year]/[month]/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { PeriodDetail } from "@/components/month-end/period-detail";

interface PeriodDetailPageProps {
  params: Promise<{ year: string; month: string }>;
}

export default async function PeriodDetailPage({ params }: PeriodDetailPageProps) {
  const { year, month } = await params;
  const reportYear = parseInt(year, 10);
  const reportMonth = parseInt(month, 10);

  const session = await auth();
  if (!session?.user) redirect("/login");

  const canAccess = await hasPermission(session.user.id, "monthend");
  if (!canAccess) redirect("/dashboard");

  const snapshots = await prisma.monthEndSnapshot.findMany({
    where: { reportYear, reportMonth },
    orderBy: { orderNo: "asc" },
  });

  const serialized = snapshots.map((s) => ({
    id: s.id,
    orderId: s.orderId,
    orderNo: s.orderNo,
    customerId: s.customerId,
    companyName: s.companyName,
    orderTotal: s.orderTotal.toString(),
    percentComplete: s.percentComplete,
    accrual: s.accrual.toString(),
  }));

  return (
    <PeriodDetail
      snapshots={serialized}
      year={reportYear}
      month={reportMonth}
    />
  );
}
```

**Step 2: Create client component**

Create `src/components/month-end/period-detail.tsx`:

A "use client" component (~250 lines) with:

- Back button to /month-end
- Header: period name (e.g. "January 2026")
- 4 summary cards: Total Orders (count), Total Order Value ($), Total Accruals ($), Average % Complete
- Editable table: Order # (links to /orders/[orderId]), Customer, Order Total ($), % Complete (Select dropdown with 0/25/50/75/100), Accrual ($ read-only, auto-updates)
- Each % complete change calls PATCH `/api/month-end/[year]/[month]/[id]` then updates local state immediately (optimistic) + router.refresh()
- Summary row at bottom with totals
- Action buttons:
  - "Export CSV" — navigates to `/api/month-end/[year]/[month]/export` (triggers download)
  - "Delete Period" — AlertDialog confirmation, calls DELETE `/api/month-end/[year]/[month]`, redirects to /month-end
- Empty state: "No snapshots for this period."

Use shadcn Select component for the percent-complete dropdown. Use Card components for summary. Use AlertDialog for delete confirmation (already installed from invoicing module).

**Step 3: Verify build**

```bash
npx next build
```

**Step 4: Commit**

```bash
git add "src/app/(authenticated)/month-end/[year]/[month]/page.tsx" src/components/month-end/period-detail.tsx
git commit -m "feat: add month-end period detail page with inline percent-complete editing"
```
