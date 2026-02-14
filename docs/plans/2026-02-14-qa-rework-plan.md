# QA & Rework Tracking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add QA inspection, rework plan creation, rework resolution, and re-inspection workflow with failure type classification.

**Architecture:** New API routes under `/api/qa/` and `/api/admin/failure-types/` with `QA_MANAGE` permission checks. New pages at `/qa`, `/qa/[id]`, and `/admin/failure-types`. QA section added to existing `/shop/[id]` page. Schema migration adds `CoatingFailure` and `MethodFailure` lookup models plus Prisma mock updates.

**Tech Stack:** Next.js 16 App Router, Prisma 6, Vitest, Zod, shadcn/ui, sonner toasts.

---

### Task 1: Schema Migration — Failure Type Lookup Tables

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/__mocks__/prisma.ts`

**Step 1: Add CoatingFailure model**

In `prisma/schema.prisma`, after the `ReworkMemo` model (around line 507), add:

```prisma
model CoatingFailure {
  id          String  @id @default(cuid())
  code        String  @unique
  description String
  isActive    Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("coating_failures")
}
```

**Step 2: Add MethodFailure model**

Immediately after `CoatingFailure`, add:

```prisma
model MethodFailure {
  id          String  @id @default(cuid())
  code        String  @unique
  description String
  isActive    Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("method_failures")
}
```

**Step 3: Run migration**

```bash
cp ../../.env .env 2>/dev/null || true
npx prisma migrate dev --name add-qa-failure-types
```

**Step 4: Add mocks to `src/lib/__mocks__/prisma.ts`**

Add to the prisma object:

```typescript
rework: createModelMock(),
reworkMemo: createModelMock(),
coatingFailure: createModelMock(),
methodFailure: createModelMock(),
```

**Step 5: Verify tests still pass**

```bash
npx vitest run
```

Expected: 429 tests passing.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(qa): add schema migration for failure type lookup tables"
```

---

### Task 2: Validation Schemas + Tests

**Files:**
- Create: `src/lib/validations/qa.ts`
- Create: `src/lib/validations/qa.test.ts`
- Create: `src/lib/validations/failure-type.ts`
- Create: `src/lib/validations/failure-type.test.ts`

**Step 1: Create QA validation schemas**

Create `src/lib/validations/qa.ts`:

```typescript
import { z } from "zod";

export const inspectItemSchema = z.object({
  detailId: z.string().min(1, "Detail ID is required"),
  currentPass: z.number().int().min(0, "Current pass must be non-negative"),
  reworkQty: z.number().int().min(0, "Rework quantity must be non-negative").optional(),
});

export type InspectItemInput = z.infer<typeof inspectItemSchema>;

export const qaStatusSchema = z.object({
  action: z.enum(["rework", "pass", "return"]),
  notes: z.string().max(500).optional(),
});

export type QaStatusInput = z.infer<typeof qaStatusSchema>;

export const reworkPlanSchema = z.object({
  reworkId: z.string().min(1, "Rework ID is required"),
  productType: z.enum(["222M", "505", "Other", "Custom", "Re-Rework"]),
  templateId: z.string().optional(),
  qaNotes: z.string().max(2000).optional(),
  coatingFailure: z.string().max(200).optional(),
  methodFailure: z.string().max(200).optional(),
  operations: z.string().max(500).optional(),
  department: z.string().max(200).optional(),
});

export type ReworkPlanInput = z.infer<typeof reworkPlanSchema>;

export const reworkActionSchema = z.object({
  action: z.enum(["start", "resolve"]),
});

export type ReworkActionInput = z.infer<typeof reworkActionSchema>;
```

**Step 2: Create failure type validation schemas**

Create `src/lib/validations/failure-type.ts`:

```typescript
import { z } from "zod";

export const failureTypeSchema = z.object({
  code: z.string().min(1, "Code is required").max(50),
  description: z.string().min(1, "Description is required").max(500),
});

export type FailureTypeInput = z.infer<typeof failureTypeSchema>;

export const updateFailureTypeSchema = z.object({
  code: z.string().min(1, "Code is required").max(50),
  description: z.string().min(1, "Description is required").max(500),
  isActive: z.boolean().optional(),
});

export type UpdateFailureTypeInput = z.infer<typeof updateFailureTypeSchema>;

export const FAILURE_TYPE_CATEGORIES = ["coating", "method"] as const;
export type FailureTypeCategory = (typeof FAILURE_TYPE_CATEGORIES)[number];
```

**Step 3: Write QA validation tests**

Create `src/lib/validations/qa.test.ts` with tests for:
- `inspectItemSchema`: valid data, valid with reworkQty, missing detailId, negative currentPass, negative reworkQty
- `qaStatusSchema`: valid "rework", valid "pass", valid "return", invalid action, notes too long
- `reworkPlanSchema`: valid full data, minimal data (just reworkId + productType), invalid productType, missing reworkId, qaNotes too long
- `reworkActionSchema`: valid "start", valid "resolve", invalid action

**Step 4: Write failure type validation tests**

Create `src/lib/validations/failure-type.test.ts` with tests for:
- `failureTypeSchema`: valid data, missing code, empty code, missing description, code too long
- `updateFailureTypeSchema`: valid data, with isActive, missing code
- `FAILURE_TYPE_CATEGORIES`: contains "coating" and "method"

**Step 5: Run tests, commit**

```bash
npx vitest run
git add -A
git commit -m "feat(qa): add validation schemas for QA inspection and failure types"
```

---

### Task 3: QA Inspect API + Tests

**Files:**
- Create: `src/app/api/qa/orders/[id]/inspect/route.ts`
- Create: `src/app/api/qa/orders/[id]/inspect/route.test.ts`

**Step 1: Create inspect route**

Create `src/app/api/qa/orders/[id]/inspect/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { inspectItemSchema } from "@/lib/validations/qa";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "QA_MANAGE");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "IN_PROGRESS" && order.status !== "REWORK") {
    return NextResponse.json(
      { error: "Only in-progress or rework orders can be inspected" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const result = inspectItemSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { detailId, currentPass, reworkQty } = result.data;

  const detail = await prisma.orderDetail.findUnique({
    where: { id: detailId },
  });

  if (!detail || detail.orderId !== id) {
    return NextResponse.json(
      { error: "Order detail not found" },
      { status: 404 }
    );
  }

  // Validate quantity constraint
  const remaining = detail.quantity - detail.passedQty - detail.reworkQty;
  const totalInspected = currentPass + (reworkQty ?? 0);

  if (totalInspected > remaining) {
    return NextResponse.json(
      { error: "Inspection quantity exceeds remaining uninspected items" },
      { status: 400 }
    );
  }

  // Update the detail
  const updated = await prisma.orderDetail.update({
    where: { id: detailId },
    data: {
      currentPass,
      passedQty: detail.passedQty + currentPass,
      reworkQty: detail.reworkQty + (reworkQty ?? 0),
    },
  });

  // Create rework record if items flagged
  if (reworkQty && reworkQty > 0) {
    await prisma.rework.create({
      data: {
        orderId: id,
        orderDetailId: detailId,
        reworkQty,
        status: "FLAGGED",
      },
    });
  }

  return NextResponse.json(updated);
}
```

**Step 2: Write tests**

Tests should cover:
- 401 unauthenticated
- 403 no QA_MANAGE permission
- 404 order not found
- 400 order not IN_PROGRESS or REWORK (test with PENDING)
- 400 validation failure (missing detailId)
- 404 detail not found or doesn't belong to order
- 400 inspection quantity exceeds remaining
- 200 pass items only (passedQty incremented, no rework record)
- 200 pass and rework (passedQty incremented, reworkQty incremented, Rework record created with FLAGGED status)
- 200 allows inspection on REWORK status orders (for re-inspection)

Mock `@/lib/permissions` with `vi.mock("@/lib/permissions", () => ({ hasPermission: vi.fn().mockResolvedValue(true), getUserPermissions: vi.fn().mockResolvedValue([]) }))`.

Follow test patterns from `src/app/api/shop/orders/[id]/receive/route.test.ts`.

**Step 3: Run tests, commit**

```bash
npx vitest run
git add -A
git commit -m "feat(qa): add QA inspection API route with tests"
```

---

### Task 4: QA Status Transitions API + Tests

**Files:**
- Create: `src/app/api/qa/orders/[id]/status/route.ts`
- Create: `src/app/api/qa/orders/[id]/status/route.test.ts`

**Step 1: Create QA status route**

Create `src/app/api/qa/orders/[id]/status/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { qaStatusSchema } from "@/lib/validations/qa";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "QA_MANAGE");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const body = await request.json();
  const result = qaStatusSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      details: { select: { quantity: true, passedQty: true, reworkQty: true } },
      reworkItems: { select: { resolved: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { action, notes } = result.data;

  if (action === "rework") {
    if (order.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Only in-progress orders can be sent to rework" },
        { status: 400 }
      );
    }

    const hasRework = order.reworkItems.some((r) => !r.resolved);
    if (!hasRework) {
      return NextResponse.json(
        { error: "No unresolved rework items exist" },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: "REWORK" },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: "IN_PROGRESS",
        toStatus: "REWORK",
        changedById: session.user.id,
        notes: notes || null,
      },
    });

    return NextResponse.json(updated);
  }

  if (action === "pass") {
    if (order.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Only in-progress orders can pass QA" },
        { status: 400 }
      );
    }

    const allPassed = order.details.every(
      (d) => d.passedQty >= d.quantity
    );
    if (!allPassed) {
      return NextResponse.json(
        { error: "Not all items have passed inspection" },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: "READY_TO_SHIP" },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: "IN_PROGRESS",
        toStatus: "READY_TO_SHIP",
        changedById: session.user.id,
        notes: notes || null,
      },
    });

    return NextResponse.json(updated);
  }

  if (action === "return") {
    if (order.status !== "REWORK") {
      return NextResponse.json(
        { error: "Only rework orders can be returned to QA" },
        { status: 400 }
      );
    }

    const allResolved = order.reworkItems.every((r) => r.resolved);
    if (!allResolved) {
      return NextResponse.json(
        { error: "Not all rework items are resolved" },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: "REWORK",
        toStatus: "IN_PROGRESS",
        changedById: session.user.id,
        notes: notes || null,
      },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
```

**Step 2: Write tests**

Tests should cover:
- 401, 403 (QA_MANAGE)
- 404 order not found
- "rework": 400 not IN_PROGRESS, 400 no unresolved rework items, 200 transitions to REWORK + history
- "pass": 400 not IN_PROGRESS, 400 not all items passed, 200 transitions to READY_TO_SHIP + history
- "return": 400 not REWORK, 400 not all rework resolved, 200 transitions to IN_PROGRESS + history
- Invalid action returns 400

**Step 3: Run tests, commit**

```bash
npx vitest run
git add -A
git commit -m "feat(qa): add QA status transition API route with tests"
```

---

### Task 5: Rework Plan + Rework Action API + Tests

**Files:**
- Create: `src/app/api/qa/orders/[id]/rework-plans/route.ts`
- Create: `src/app/api/qa/orders/[id]/rework-plans/route.test.ts`
- Create: `src/app/api/qa/orders/[id]/rework/[reworkId]/route.ts`
- Create: `src/app/api/qa/orders/[id]/rework/[reworkId]/route.test.ts`

**Step 1: Create rework plan route**

Create `src/app/api/qa/orders/[id]/rework-plans/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { reworkPlanSchema } from "@/lib/validations/qa";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "QA_MANAGE");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const body = await request.json();
  const result = reworkPlanSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { reworkId, productType, templateId, qaNotes, coatingFailure, methodFailure, operations, department } = result.data;

  // Verify rework item exists and belongs to this order
  const rework = await prisma.rework.findUnique({
    where: { id: reworkId },
  });

  if (!rework || rework.orderId !== id) {
    return NextResponse.json(
      { error: "Rework item not found" },
      { status: 404 }
    );
  }

  if (rework.status !== "FLAGGED") {
    return NextResponse.json(
      { error: "Rework item already has a plan" },
      { status: 400 }
    );
  }

  // Create the rework memo (plan)
  const memo = await prisma.reworkMemo.create({
    data: {
      productType,
      processTemplate: templateId || null,
      qaNotes: qaNotes || null,
      coatingFailure: coatingFailure || null,
      methodFailure: methodFailure || null,
      operations: operations || null,
      department: department || null,
      createdById: session.user.id,
    },
  });

  // Link rework item to plan and update status
  const updated = await prisma.rework.update({
    where: { id: reworkId },
    data: {
      reworkMemoId: memo.id,
      status: "PLAN_CREATED",
    },
  });

  return NextResponse.json({ rework: updated, plan: memo }, { status: 201 });
}
```

**Step 2: Create rework action route**

Create `src/app/api/qa/orders/[id]/rework/[reworkId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { reworkActionSchema } from "@/lib/validations/qa";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reworkId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "QA_MANAGE");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, reworkId } = await params;

  const rework = await prisma.rework.findUnique({
    where: { id: reworkId },
  });

  if (!rework || rework.orderId !== id) {
    return NextResponse.json(
      { error: "Rework item not found" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const result = reworkActionSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { action } = result.data;

  if (action === "start") {
    if (rework.status !== "PLAN_CREATED") {
      return NextResponse.json(
        { error: "Only rework items with plans can be started" },
        { status: 400 }
      );
    }

    const updated = await prisma.rework.update({
      where: { id: reworkId },
      data: { status: "IN_PROGRESS" },
    });

    return NextResponse.json(updated);
  }

  if (action === "resolve") {
    if (rework.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Only in-progress rework items can be resolved" },
        { status: 400 }
      );
    }

    const updated = await prisma.rework.update({
      where: { id: reworkId },
      data: {
        status: "RESOLVED",
        resolved: true,
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
```

**Step 3: Write tests for both routes**

rework-plans tests:
- 401, 403, 404 order, 404 rework item, 400 rework not FLAGGED
- 400 validation failure (missing productType)
- 201 creates plan and links to rework item, status → PLAN_CREATED

rework action tests:
- 401, 403, 404 rework item
- "start": 400 not PLAN_CREATED, 200 transitions to IN_PROGRESS
- "resolve": 400 not IN_PROGRESS, 200 transitions to RESOLVED (resolved=true, resolvedAt set)
- Invalid action returns 400

**Step 4: Run tests, commit**

```bash
npx vitest run
git add -A
git commit -m "feat(qa): add rework plan creation and rework action API routes with tests"
```

---

### Task 6: QA Orders List API + Tests

**Files:**
- Create: `src/app/api/qa/orders/route.ts`
- Create: `src/app/api/qa/orders/route.test.ts`

**Step 1: Create QA orders list route**

Create `src/app/api/qa/orders/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "QA_MANAGE");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};

  if (status === "rework") {
    where.status = "REWORK";
  } else if (status === "in_progress") {
    where.status = "IN_PROGRESS";
  } else {
    // Default: show IN_PROGRESS and REWORK orders
    where.status = { in: ["IN_PROGRESS", "REWORK"] };
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      customer: { select: { id: true, company: true } },
      details: {
        select: { quantity: true, passedQty: true, reworkQty: true },
      },
      reworkItems: {
        select: { id: true, resolved: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}
```

**Step 2: Write tests**

Tests should cover:
- 401, 403 (QA_MANAGE)
- 200 returns orders with default filter (IN_PROGRESS + REWORK)
- 200 filters by status=rework
- 200 filters by status=in_progress
- 200 includes customer, details with QA counts, rework items

**Step 3: Run tests, commit**

```bash
npx vitest run
git add -A
git commit -m "feat(qa): add QA orders list API route with tests"
```

---

### Task 7: Failure Types Admin API + Tests

**Files:**
- Create: `src/app/api/admin/failure-types/route.ts`
- Create: `src/app/api/admin/failure-types/route.test.ts`
- Create: `src/app/api/admin/failure-types/[type]/route.ts`
- Create: `src/app/api/admin/failure-types/[type]/route.test.ts`
- Create: `src/app/api/admin/failure-types/[type]/[id]/route.ts`
- Create: `src/app/api/admin/failure-types/[type]/[id]/route.test.ts`

**Step 1: Create list route (both types)**

Create `src/app/api/admin/failure-types/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "QA_MANAGE");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [coatingFailures, methodFailures] = await Promise.all([
    prisma.coatingFailure.findMany({ orderBy: { code: "asc" } }),
    prisma.methodFailure.findMany({ orderBy: { code: "asc" } }),
  ]);

  return NextResponse.json({ coatingFailures, methodFailures });
}
```

**Step 2: Create type-specific create route**

Create `src/app/api/admin/failure-types/[type]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { failureTypeSchema, FAILURE_TYPE_CATEGORIES } from "@/lib/validations/failure-type";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "QA_MANAGE");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { type } = await params;

  if (!FAILURE_TYPE_CATEGORIES.includes(type as never)) {
    return NextResponse.json({ error: "Invalid failure type category" }, { status: 400 });
  }

  const body = await request.json();
  const result = failureTypeSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const model = type === "coating" ? prisma.coatingFailure : prisma.methodFailure;

  const created = await model.create({
    data: {
      code: result.data.code,
      description: result.data.description,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
```

**Step 3: Create type-specific update + delete route**

Create `src/app/api/admin/failure-types/[type]/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { updateFailureTypeSchema, FAILURE_TYPE_CATEGORIES } from "@/lib/validations/failure-type";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "QA_MANAGE");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { type, id } = await params;

  if (!FAILURE_TYPE_CATEGORIES.includes(type as never)) {
    return NextResponse.json({ error: "Invalid failure type category" }, { status: 400 });
  }

  const model = type === "coating" ? prisma.coatingFailure : prisma.methodFailure;

  const existing = await model.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Failure type not found" }, { status: 404 });
  }

  const body = await request.json();
  const result = updateFailureTypeSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const updated = await model.update({
    where: { id },
    data: {
      code: result.data.code,
      description: result.data.description,
      ...(result.data.isActive !== undefined ? { isActive: result.data.isActive } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "QA_MANAGE");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { type, id } = await params;

  if (!FAILURE_TYPE_CATEGORIES.includes(type as never)) {
    return NextResponse.json({ error: "Invalid failure type category" }, { status: 400 });
  }

  const model = type === "coating" ? prisma.coatingFailure : prisma.methodFailure;

  const existing = await model.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Failure type not found" }, { status: 404 });
  }

  await model.update({
    where: { id },
    data: { isActive: false },
  });

  return new NextResponse(null, { status: 204 });
}
```

**Step 4: Write tests for all three route files**

Tests should cover:
- GET list: 401, 403, 200 returns both coating and method failure lists
- POST [type]: 401, 403, 400 invalid type, 400 validation failure, 201 creates coating failure, 201 creates method failure
- PUT [type]/[id]: 401, 403, 400 invalid type, 404 not found, 400 validation, 200 updates
- DELETE [type]/[id]: 401, 403, 400 invalid type, 404 not found, 204 soft deletes

**Step 5: Run tests, commit**

```bash
npx vitest run
git add -A
git commit -m "feat(qa): add failure types admin API routes with tests"
```

---

### Task 8: QA Queue Page UI

**Files:**
- Create: `src/app/(authenticated)/qa/page.tsx`
- Create: `src/components/qa/qa-order-list.tsx`

**Step 1: Create server page**

`src/app/(authenticated)/qa/page.tsx`:
- Server component that calls `auth()`, checks `QA_MANAGE` permission via `hasPermission()`
- Redirects to `/login` if no session, redirects to `/` if no permission
- Fetches orders with status IN_PROGRESS or REWORK via Prisma
- Include customer, details (for QA counts), rework items
- Serializes data and renders `QaOrderList` component

**Step 2: Create QA order list component**

`src/components/qa/qa-order-list.tsx`:
- Client component with status filter pills: All, In Progress, Rework
- Search by order number, customer, PO
- Table: Order #, Customer, PO #, Status badge, QA Progress (passed items / total), Rework (count of unresolved), Actions
- Click row navigates to `/qa/[id]`
- Status badges: IN_PROGRESS = blue, REWORK = red/destructive
- Empty state when no matching orders

Study `src/components/shop/shop-order-list.tsx` for the exact pattern to follow.

**Step 3: Run tests + build, commit**

```bash
npx vitest run
npx next build
git add -A
git commit -m "feat(qa): add QA queue page"
```

---

### Task 9: QA Inspection Page UI

**Files:**
- Create: `src/app/(authenticated)/qa/[id]/page.tsx`
- Create: `src/components/qa/qa-order-header.tsx`
- Create: `src/components/qa/qa-inspection-table.tsx`
- Create: `src/components/qa/rework-section.tsx`
- Create: `src/components/qa/rework-plan-dialog.tsx`

**Step 1: Create server page**

`src/app/(authenticated)/qa/[id]/page.tsx`:
- Server component fetching order with details (QA fields), rework items (with reworkMemo), customer, statusHistory
- Checks `QA_MANAGE` permission
- Serializes and renders header, inspection table, rework section

**Step 2: Create QA order header**

`src/components/qa/qa-order-header.tsx`:
- Shows order #, customer, status badge, PO
- "Pass QA" button: visible when all items on all lines have passedQty >= quantity AND order is IN_PROGRESS. Calls PATCH `/api/qa/orders/[id]/status` with `{ action: "pass" }`
- "Send to Rework" button: visible when unresolved rework items exist AND order is IN_PROGRESS. Calls PATCH `/api/qa/orders/[id]/status` with `{ action: "rework" }`
- "Return to QA" button: visible when order is REWORK AND all rework items resolved. Calls PATCH `/api/qa/orders/[id]/status` with `{ action: "return" }`

**Step 3: Create inspection table**

`src/components/qa/qa-inspection-table.tsx`:
- Table of line items with columns: Line #, Description, Qty, Passed, Rework, Remaining, Inspect
- Color coding: green row accent when passedQty >= quantity, red row accent when reworkQty > 0, muted when quantity is 0
- Inspect column: number input for currentPass, optional reworkQty input, "Submit" button
- Calls PATCH `/api/qa/orders/[id]/inspect` with `{ detailId, currentPass, reworkQty }`
- Disabled when order is REWORK or SHIPPED
- Progress summary: "X of Y items passed inspection"

**Step 4: Create rework section**

`src/components/qa/rework-section.tsx`:
- Card showing all rework items for the order
- Table: Line Item, Qty, Plan #, Status badge, Actions
- Status badges: FLAGGED = red, PLAN_CREATED = yellow, IN_PROGRESS = blue, RESOLVED = green
- Actions per status:
  - FLAGGED: "Create Plan" button → opens ReworkPlanDialog
  - PLAN_CREATED: "Start Rework" button → calls PATCH with action "start"
  - IN_PROGRESS: "Resolve" button → calls PATCH with action "resolve"
  - RESOLVED: shows resolved date
- Empty state "No rework items" when none exist

**Step 5: Create rework plan dialog**

`src/components/qa/rework-plan-dialog.tsx`:
- Dialog for creating rework plans
- Fields: Product Type (select: 222M, 505, Other, Custom, Re-Rework), Process Template (dropdown fetching active templates), QA Notes (textarea), Coating Failure (dropdown fetching from API), Method Failure (dropdown fetching from API), Operations (text input), Department (text input)
- Calls POST `/api/qa/orders/[id]/rework-plans`
- Toast on success/error, router.refresh()

Study `src/components/shop/shop-order-header.tsx`, `src/components/shop/shop-receiving.tsx`, and `src/components/shop/shop-process-control.tsx` for component patterns.

**Step 6: Run tests + build, commit**

```bash
npx vitest run
npx next build
git add -A
git commit -m "feat(qa): add QA inspection page with rework plan management"
```

---

### Task 10: Failure Types Admin Page UI

**Files:**
- Create: `src/app/(authenticated)/admin/failure-types/page.tsx`
- Create: `src/components/admin/failure-type-list.tsx`

**Step 1: Create server page**

`src/app/(authenticated)/admin/failure-types/page.tsx`:
- Server component, checks `QA_MANAGE` permission
- Fetches both coating and method failures via Prisma
- Serializes and renders `FailureTypeList` component

**Step 2: Create failure type list component**

`src/components/admin/failure-type-list.tsx`:
- Client component with two sections/tabs: "Coating Failures" and "Method Failures"
- Each section has a table: Code, Description, Active badge, Edit/Delete actions
- "Add" button per section opens inline form or dialog with Code + Description inputs
- Edit opens same form pre-filled
- Delete sends DELETE to API (soft-delete)
- Uses `useRouter().refresh()` after mutations

Study `src/components/admin/process-template-list.tsx` for the pattern.

**Step 3: Run tests + build, commit**

```bash
npx vitest run
npx next build
git add -A
git commit -m "feat(qa): add failure types admin page"
```

---

### Task 11: Shop Order Detail — QA Status Section

**Files:**
- Create: `src/components/shop/shop-qa-status.tsx`
- Modify: `src/app/(authenticated)/shop/[id]/page.tsx`

**Step 1: Create QA status component**

`src/components/shop/shop-qa-status.tsx`:
- Client component showing read-only QA summary for the order
- Progress: "X of Y items passed inspection"
- Per-line summary: line items with passed/rework/remaining counts
- Rework items list with status badges and plan numbers
- Link to `/qa/[id]` for users with QA_MANAGE permission (show link always, server enforces access)

**Step 2: Modify shop order detail page**

In `src/app/(authenticated)/shop/[id]/page.tsx`:
- Add QA fields to the details serialization: `currentPass`, `passedQty`, `reworkQty`
- Add rework items to the Prisma include: `reworkItems: { include: { reworkMemo: true } }`
- Render `ShopQaStatus` component below `ShopProcessControl`

**Step 3: Run tests + build, commit**

```bash
npx vitest run
npx next build
git add -A
git commit -m "feat(qa): add QA status section to shop order detail page"
```

---

### Task 12: Sidebar Updates + Permission Seeding

**Files:**
- Modify: `src/components/nav-links.tsx`

**Step 1: Add "Failure Types" to sidebar navigation**

In `src/components/nav-links.tsx`, add a "Failure Types" nav item under the Admin group. The sidebar already has "QA / Rework" → `/qa` in the Manufacturing group — no change needed there. Add:

```typescript
{ label: "Failure Types", href: "/admin/failure-types", icon: AlertTriangle },
```

Import `AlertTriangle` from `lucide-react`.

**Step 2: Seed permissions via SQL**

Run via `prisma db execute`:

```sql
INSERT INTO "permissions" ("id", "code", "description", "category", "createdAt")
VALUES
  (gen_random_uuid()::text, 'QA_MANAGE', 'Can inspect items, create rework plans, resolve rework', 'QA', NOW())
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p.id, r.id
FROM "permissions" p, "roles" r
WHERE p."code" = 'QA_MANAGE'
AND r."name" = 'ADMIN'
AND NOT EXISTS (
  SELECT 1 FROM "_PermissionToRole" pr WHERE pr."A" = p.id AND pr."B" = r.id
);
```

**Step 3: Run tests + build, commit**

```bash
npx vitest run
npx next build
git add -A
git commit -m "feat(qa): add failure types nav item and seed QA permission"
```

---

## Verification

After all tasks complete:
- `npx vitest run` — all tests pass (429 existing + new QA tests)
- `npx next build` — build succeeds with no TypeScript errors
- Manual test: spin up dev server, navigate to /qa, /qa/[id], /admin/failure-types

## Key Files

- `prisma/schema.prisma` (modify — add CoatingFailure, MethodFailure)
- `src/lib/__mocks__/prisma.ts` (modify — add new model mocks)
- `src/lib/validations/qa.ts` (new)
- `src/lib/validations/qa.test.ts` (new)
- `src/lib/validations/failure-type.ts` (new)
- `src/lib/validations/failure-type.test.ts` (new)
- `src/app/api/qa/orders/route.ts` (new)
- `src/app/api/qa/orders/[id]/inspect/route.ts` (new)
- `src/app/api/qa/orders/[id]/status/route.ts` (new)
- `src/app/api/qa/orders/[id]/rework-plans/route.ts` (new)
- `src/app/api/qa/orders/[id]/rework/[reworkId]/route.ts` (new)
- `src/app/api/admin/failure-types/route.ts` (new)
- `src/app/api/admin/failure-types/[type]/route.ts` (new)
- `src/app/api/admin/failure-types/[type]/[id]/route.ts` (new)
- `src/app/(authenticated)/qa/page.tsx` (new)
- `src/components/qa/qa-order-list.tsx` (new)
- `src/app/(authenticated)/qa/[id]/page.tsx` (new)
- `src/components/qa/qa-order-header.tsx` (new)
- `src/components/qa/qa-inspection-table.tsx` (new)
- `src/components/qa/rework-section.tsx` (new)
- `src/components/qa/rework-plan-dialog.tsx` (new)
- `src/app/(authenticated)/admin/failure-types/page.tsx` (new)
- `src/components/admin/failure-type-list.tsx` (new)
- `src/components/shop/shop-qa-status.tsx` (new)
- `src/app/(authenticated)/shop/[id]/page.tsx` (modify)
- `src/components/nav-links.tsx` (modify)
- Test files for all new API routes (new)
