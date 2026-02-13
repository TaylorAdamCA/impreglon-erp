# Shop/Manufacturing Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add shop floor operations (receiving, process control, shipping) with admin process template management.

**Architecture:** New API routes under `/api/shop/` and `/api/admin/process-templates/` with permission checks. New pages under `(authenticated)/shop/` and `(authenticated)/admin/process-templates/`. Schema migration adds `receivedAt` to OrderDetail and new `OrderProcessStep` model.

**Tech Stack:** Next.js 16 App Router, Prisma 6, Vitest, Zod, shadcn/ui, TanStack Query patterns.

---

### Task 1: Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/__mocks__/prisma.ts`

**Step 1: Add `receivedAt` to OrderDetail model**

In `prisma/schema.prisma`, add to the OrderDetail model after the `hasInternals` field:

```prisma
  receivedAt DateTime?
```

**Step 2: Add OrderProcessStep model**

In `prisma/schema.prisma`, after the ProcessTemplateStep model (around line 645), add:

```prisma
model OrderProcessStep {
  id              String    @id @default(cuid())
  orderId         String
  templateStepId  String
  stepNumber      Int
  operationName   String
  completedAt     DateTime?
  completedById   String?
  notes           String?

  order       Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  completedBy User?       @relation("ProcessStepCompletedBy", fields: [completedById], references: [id])

  createdAt DateTime @default(now())

  @@index([orderId])
  @@map("order_process_steps")
}
```

**Step 3: Add relations to Order and User models**

In the Order model, add to the relations section:

```prisma
  processSteps    OrderProcessStep[]
```

In the User model, add:

```prisma
  processSteps   OrderProcessStep[] @relation("ProcessStepCompletedBy")
```

**Step 4: Run migration**

```bash
npx prisma migrate dev --name add-shop-manufacturing
```

Copy `.env` from main repo first if needed:
```bash
cp ../../.env .env
```

**Step 5: Add mocks to `src/lib/__mocks__/prisma.ts`**

Add to the prisma object:

```typescript
orderProcessStep: createModelMock(),
processTemplate: createModelMock(),
processTemplateStep: createModelMock(),
```

**Step 6: Verify tests still pass**

```bash
npx vitest run
```

Expected: 306 tests passing.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat(shop): add schema migration for OrderProcessStep and receivedAt"
```

---

### Task 2: Validation Schemas + Tests

**Files:**
- Create: `src/lib/validations/shop.ts`
- Create: `src/lib/validations/shop.test.ts`
- Create: `src/lib/validations/process-template.ts`
- Create: `src/lib/validations/process-template.test.ts`

**Step 1: Create shop validation schemas**

Create `src/lib/validations/shop.ts`:

```typescript
import { z } from "zod";

export const receiveItemSchema = z.object({
  detailId: z.string().min(1, "Detail ID is required"),
  received: z.boolean(),
});

export type ReceiveItemInput = z.infer<typeof receiveItemSchema>;

export const assignTemplateSchema = z.object({
  templateId: z.string().min(1, "Template ID is required"),
});

export type AssignTemplateInput = z.infer<typeof assignTemplateSchema>;

export const processStepSchema = z.object({
  stepId: z.string().min(1, "Step ID is required"),
  completed: z.boolean(),
  notes: z.string().max(500).optional(),
});

export type ProcessStepInput = z.infer<typeof processStepSchema>;

export const shipOrderSchema = z.object({
  notes: z.string().max(500).optional(),
});

export type ShipOrderInput = z.infer<typeof shipOrderSchema>;
```

**Step 2: Create process template validation schemas**

Create `src/lib/validations/process-template.ts`:

```typescript
import { z } from "zod";

export const processTemplateStepSchema = z.object({
  operationName: z.string().min(1, "Operation name is required").max(200),
  description: z.string().max(500).optional(),
});

export const createProcessTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(500).optional(),
  steps: z.array(processTemplateStepSchema).min(1, "At least one step is required"),
});

export type CreateProcessTemplateInput = z.infer<typeof createProcessTemplateSchema>;

export const updateProcessTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  steps: z.array(processTemplateStepSchema).min(1, "At least one step is required"),
});

export type UpdateProcessTemplateInput = z.infer<typeof updateProcessTemplateSchema>;
```

**Step 3: Write shop validation tests**

Create `src/lib/validations/shop.test.ts` with tests for:
- `receiveItemSchema`: valid data, missing detailId, missing received
- `assignTemplateSchema`: valid data, empty templateId
- `processStepSchema`: valid data, missing stepId, notes too long
- `shipOrderSchema`: valid empty, valid with notes, notes too long

**Step 4: Write process template validation tests**

Create `src/lib/validations/process-template.test.ts` with tests for:
- `createProcessTemplateSchema`: valid data, missing name, empty steps array, step missing operationName
- `updateProcessTemplateSchema`: valid data, with isActive, empty steps array

**Step 5: Run tests**

```bash
npx vitest run
```

Expected: All new + existing tests pass.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(shop): add validation schemas for shop operations and process templates"
```

---

### Task 3: Process Template CRUD API + Tests

**Files:**
- Create: `src/app/api/admin/process-templates/route.ts`
- Create: `src/app/api/admin/process-templates/route.test.ts`
- Create: `src/app/api/admin/process-templates/[id]/route.ts`
- Create: `src/app/api/admin/process-templates/[id]/route.test.ts`

**Step 1: Create list + create route**

Create `src/app/api/admin/process-templates/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createProcessTemplateSchema } from "@/lib/validations/process-template";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "PROCESS_TEMPLATES_MANAGE");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const includeInactive = searchParams.get("includeInactive") === "true";

  const templates = await prisma.processTemplate.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "PROCESS_TEMPLATES_MANAGE");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const result = createProcessTemplateSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { name, description, steps } = result.data;

  const template = await prisma.processTemplate.create({
    data: {
      name,
      description: description || null,
      steps: {
        create: steps.map((step, index) => ({
          stepNumber: index + 1,
          operationName: step.operationName,
          description: step.description || null,
        })),
      },
    },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  });

  return NextResponse.json(template, { status: 201 });
}
```

**Step 2: Create detail + update + delete route**

Create `src/app/api/admin/process-templates/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { updateProcessTemplateSchema } from "@/lib/validations/process-template";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "PROCESS_TEMPLATES_MANAGE");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const template = await prisma.processTemplate.findUnique({
    where: { id },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json(template);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "PROCESS_TEMPLATES_MANAGE");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.processTemplate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const body = await request.json();
  const result = updateProcessTemplateSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { name, description, isActive, steps } = result.data;

  // Delete existing steps and replace
  await prisma.processTemplateStep.deleteMany({ where: { templateId: id } });

  const template = await prisma.processTemplate.update({
    where: { id },
    data: {
      name,
      description: description || null,
      ...(isActive !== undefined ? { isActive } : {}),
      steps: {
        create: steps.map((step, index) => ({
          stepNumber: index + 1,
          operationName: step.operationName,
          description: step.description || null,
        })),
      },
    },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  });

  return NextResponse.json(template);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "PROCESS_TEMPLATES_MANAGE");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.processTemplate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Soft delete — set inactive
  await prisma.processTemplate.update({
    where: { id },
    data: { isActive: false },
  });

  return new NextResponse(null, { status: 204 });
}
```

**Step 3: Write tests for both route files**

Tests should cover:
- GET list: returns templates, respects includeInactive param, 401 unauth, 403 no permission
- POST create: valid create with steps, validation failure, 401/403
- GET [id]: returns template, 404, 401/403
- PUT [id]: updates template and replaces steps, 404, validation failure, 401/403
- DELETE [id]: soft deletes (sets inactive), 404, 401/403

Mock `hasPermission` by mocking the `@/lib/permissions` module:

```typescript
vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
  getUserPermissions: vi.fn().mockResolvedValue([]),
}));
```

Then for 403 tests: `vi.mocked(hasPermission).mockResolvedValueOnce(false)`.

**Step 4: Run tests, commit**

```bash
npx vitest run
git add -A
git commit -m "feat(shop): add process template CRUD API routes with tests"
```

---

### Task 4: Shop Receive API + Tests

**Files:**
- Create: `src/app/api/shop/orders/[id]/receive/route.ts`
- Create: `src/app/api/shop/orders/[id]/receive/route.test.ts`

**Step 1: Create receive route**

Create `src/app/api/shop/orders/[id]/receive/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { receiveItemSchema } from "@/lib/validations/shop";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "SHOP_RECEIVE");
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

  if (order.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "Only in-progress orders can receive items" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const result = receiveItemSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { detailId, received } = result.data;

  // Verify the detail belongs to this order
  const detail = await prisma.orderDetail.findUnique({
    where: { id: detailId },
  });

  if (!detail || detail.orderId !== id) {
    return NextResponse.json(
      { error: "Order detail not found" },
      { status: 404 }
    );
  }

  const updated = await prisma.orderDetail.update({
    where: { id: detailId },
    data: { receivedAt: received ? new Date() : null },
  });

  return NextResponse.json(updated);
}
```

**Step 2: Write tests**

Tests should cover:
- 401 unauthenticated
- 403 no SHOP_RECEIVE permission
- 404 order not found
- 400 order not IN_PROGRESS
- 400 validation failure
- 404 detail not found or doesn't belong to order
- 200 marks detail as received (receivedAt set)
- 200 unmarks detail (receivedAt null)

**Step 3: Run tests, commit**

```bash
npx vitest run
git add -A
git commit -m "feat(shop): add receiving API route with tests"
```

---

### Task 5: Shop Assign Template + Process Steps API + Tests

**Files:**
- Create: `src/app/api/shop/orders/[id]/assign-template/route.ts`
- Create: `src/app/api/shop/orders/[id]/assign-template/route.test.ts`
- Create: `src/app/api/shop/orders/[id]/process/route.ts`
- Create: `src/app/api/shop/orders/[id]/process/route.test.ts`

**Step 1: Create assign-template route**

Create `src/app/api/shop/orders/[id]/assign-template/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { assignTemplateSchema } from "@/lib/validations/shop";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "SHOP_PROCESS");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, status: true, processTemplate: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "Only in-progress orders can be assigned templates" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const result = assignTemplateSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { templateId } = result.data;

  const template = await prisma.processTemplate.findUnique({
    where: { id: templateId },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  });

  if (!template || !template.isActive) {
    return NextResponse.json(
      { error: "Template not found or inactive" },
      { status: 404 }
    );
  }

  // Delete existing process steps for this order (reassignment)
  await prisma.orderProcessStep.deleteMany({ where: { orderId: id } });

  // Create snapshot of template steps
  for (const step of template.steps) {
    await prisma.orderProcessStep.create({
      data: {
        orderId: id,
        templateStepId: step.id,
        stepNumber: step.stepNumber,
        operationName: step.operationName,
      },
    });
  }

  // Store template ID on order
  const updated = await prisma.order.update({
    where: { id },
    data: { processTemplate: templateId },
    include: {
      processSteps: { orderBy: { stepNumber: "asc" } },
    },
  });

  return NextResponse.json(updated);
}
```

**Step 2: Create process step completion route**

Create `src/app/api/shop/orders/[id]/process/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { processStepSchema } from "@/lib/validations/shop";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "SHOP_PROCESS");
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

  if (order.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "Only in-progress orders can have steps completed" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const result = processStepSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { stepId, completed, notes } = result.data;

  // Find the step
  const step = await prisma.orderProcessStep.findUnique({
    where: { id: stepId },
  });

  if (!step || step.orderId !== id) {
    return NextResponse.json(
      { error: "Process step not found" },
      { status: 404 }
    );
  }

  // Enforce sequential completion
  if (completed && step.stepNumber > 1) {
    const previousSteps = await prisma.orderProcessStep.findMany({
      where: {
        orderId: id,
        stepNumber: { lt: step.stepNumber },
        completedAt: null,
      },
    });

    if (previousSteps.length > 0) {
      return NextResponse.json(
        { error: "Previous steps must be completed first" },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.orderProcessStep.update({
    where: { id: stepId },
    data: {
      completedAt: completed ? new Date() : null,
      completedById: completed ? session.user.id : null,
      notes: notes ?? null,
    },
  });

  return NextResponse.json(updated);
}
```

**Step 3: Write tests for both routes**

assign-template tests:
- 401, 403, 404 order, 400 not IN_PROGRESS, 404 template not found/inactive
- 200 creates process steps from template, stores templateId on order
- 200 reassignment deletes old steps and creates new

process tests:
- 401, 403, 404 order, 400 not IN_PROGRESS, 404 step not found
- 400 sequential enforcement (can't complete step 2 before step 1)
- 200 completes step (sets completedAt, completedById)
- 200 uncompletes step (clears completedAt)

**Step 4: Run tests, commit**

```bash
npx vitest run
git add -A
git commit -m "feat(shop): add template assignment and process control API routes with tests"
```

---

### Task 6: Shop Ship API + Tests

**Files:**
- Create: `src/app/api/shop/orders/[id]/ship/route.ts`
- Create: `src/app/api/shop/orders/[id]/ship/route.test.ts`

**Step 1: Create ship route**

Create `src/app/api/shop/orders/[id]/ship/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { shipOrderSchema } from "@/lib/validations/shop";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "SHOP_SHIP");
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

  if (order.status !== "READY_TO_SHIP") {
    return NextResponse.json(
      { error: "Only orders ready to ship can be shipped" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const result = shipOrderSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "SHIPPED",
      shipDate: new Date(),
    },
  });

  await prisma.orderStatusHistory.create({
    data: {
      orderId: id,
      fromStatus: "READY_TO_SHIP",
      toStatus: "SHIPPED",
      changedById: session.user.id,
      notes: result.data.notes || null,
    },
  });

  return NextResponse.json(updated);
}
```

**Step 2: Write tests**

Tests should cover:
- 401, 403 (SHOP_SHIP), 404 order, 400 not READY_TO_SHIP
- 200 ships order (status SHIPPED, shipDate set, history created)
- 200 with notes

**Step 3: Run tests, commit**

```bash
npx vitest run
git add -A
git commit -m "feat(shop): add shipping API route with tests"
```

---

### Task 7: Extend Order Status — "ready" Action

**Files:**
- Modify: `src/lib/validations/order.ts`
- Modify: `src/app/api/orders/[id]/status/route.ts`
- Modify: `src/app/api/orders/[id]/status/route.test.ts`

**Step 1: Add "ready" action to validation schema**

In `src/lib/validations/order.ts`, change:

```typescript
export const ORDER_STATUS_ACTIONS = ["start", "complete"] as const;
```

to:

```typescript
export const ORDER_STATUS_ACTIONS = ["start", "complete", "ready"] as const;
```

**Step 2: Add "ready" handler to status route**

In `src/app/api/orders/[id]/status/route.ts`, add before the final return:

```typescript
  if (action === "ready") {
    if (order.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Only in-progress orders can be marked ready to ship" },
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
```

**Step 3: Add tests for "ready" action**

Add to `src/app/api/orders/[id]/status/route.test.ts`:
- "ready" transitions IN_PROGRESS → READY_TO_SHIP
- "ready" rejects non-IN_PROGRESS orders
- "ready" creates status history record

**Step 4: Run tests, commit**

```bash
npx vitest run
git add -A
git commit -m "feat(shop): add 'ready' status action for marking orders ready to ship"
```

---

### Task 8: Process Templates Admin Page UI

**Files:**
- Create: `src/app/(authenticated)/admin/process-templates/page.tsx`
- Create: `src/components/admin/process-template-list.tsx`
- Create: `src/components/admin/process-template-editor.tsx`

**Step 1: Create server page**

`src/app/(authenticated)/admin/process-templates/page.tsx`:
- Server component that calls `auth()`, checks `PROCESS_TEMPLATES_MANAGE` permission
- Fetches templates via Prisma
- Renders `ProcessTemplateList` component

**Step 2: Create template list component**

`src/components/admin/process-template-list.tsx`:
- Client component with "New Template" button
- Table: Name, Description, Steps count, Active badge, Edit/Delete actions
- Edit opens inline editor or dialog
- Delete confirmation with soft-delete

**Step 3: Create template editor component**

`src/components/admin/process-template-editor.tsx`:
- Dialog with fields: Name, Description
- Steps list: ordered, each with Operation Name + Description
- Add step button, remove step (X), reorder with up/down buttons
- Save sends POST (create) or PUT (update) to API
- Uses `useRouter().refresh()` after save

**Step 4: Run tests + build, commit**

```bash
npx vitest run
npx next build
git add -A
git commit -m "feat(shop): add process templates admin page"
```

---

### Task 9: Shop Dashboard Page UI

**Files:**
- Create: `src/app/(authenticated)/shop/page.tsx`
- Create: `src/components/shop/shop-order-list.tsx`

**Step 1: Create server page**

`src/app/(authenticated)/shop/page.tsx`:
- Server component, calls `auth()`
- Fetches orders with status IN_PROGRESS or READY_TO_SHIP via Prisma
- Include customer, details count, process steps progress
- Renders `ShopOrderList`

**Step 2: Create shop order list component**

`src/components/shop/shop-order-list.tsx`:
- Client component with status filter pills: All, In Progress, Ready to Ship, Shipped
- Search by order number, customer, PO
- Table: Order #, Customer, PO #, Status badge, Items (received/total), Process (completed/total steps), Actions
- Click row navigates to `/shop/{id}`
- Status badges: IN_PROGRESS = blue, READY_TO_SHIP = green, SHIPPED = gray

**Step 3: Run tests + build, commit**

```bash
npx vitest run
npx next build
git add -A
git commit -m "feat(shop): add shop dashboard page"
```

---

### Task 10: Shop Order Detail Page UI

**Files:**
- Create: `src/app/(authenticated)/shop/[id]/page.tsx`
- Create: `src/components/shop/shop-order-header.tsx`
- Create: `src/components/shop/shop-receiving.tsx`
- Create: `src/components/shop/shop-process-control.tsx`

**Step 1: Create server page**

`src/app/(authenticated)/shop/[id]/page.tsx`:
- Fetches order with details, processSteps (including completedBy), customer, statusHistory
- Serializes Decimal/Date fields
- Renders header, receiving section, process control section

**Step 2: Create shop order header**

`src/components/shop/shop-order-header.tsx`:
- Shows order #, customer, PO, status badge, dates
- Process template dropdown (admin only) — fetches templates from API, assigns via POST
- "Mark Ready to Ship" button when all process steps complete (PATCH to status route with action "ready")
- "Ship Order" button when READY_TO_SHIP (opens confirm dialog, PATCH to ship route)

**Step 3: Create receiving section**

`src/components/shop/shop-receiving.tsx`:
- Progress bar: "3 of 5 items received"
- Table of line items with checkbox toggle per row
- Checkbox calls PATCH to receive route
- Shows receivedAt timestamp when received
- Uses `useRouter().refresh()` after toggle

**Step 4: Create process control section**

`src/components/shop/shop-process-control.tsx`:
- Shows assigned template name (or "No template assigned" message)
- Ordered checklist of steps
- Each step: checkbox, operation name, description, completed by / completed at
- Sequential enforcement in UI — disable checkbox if previous step incomplete
- Optional notes input per step
- Checkbox calls PATCH to process route
- Progress indicator: "2 of 5 steps complete"

**Step 5: Run tests + build, commit**

```bash
npx vitest run
npx next build
git add -A
git commit -m "feat(shop): add shop order detail page with receiving and process control"
```

---

### Task 11: Sidebar Updates + Permission Seeding

**Files:**
- Modify: `src/components/nav-links.tsx`
- Modify: (seed via SQL for permissions)

**Step 1: Add permission-based visibility to sidebar**

Modify `src/components/nav-links.tsx`:
- The sidebar already has "Shop Floor" → /shop and other items
- Add "Process Templates" item under Admin group: `{ label: "Process Templates", href: "/admin/process-templates", icon: ClipboardList }`
- For now, all items remain visible (permission-based sidebar filtering is a separate concern that requires passing user permissions to the client). The pages themselves enforce permissions server-side.

**Step 2: Seed permissions via SQL**

This is data seeding for the running database, not code. Run via `prisma db execute`:

```sql
INSERT INTO "permissions" ("id", "code", "description", "category", "createdAt")
VALUES
  (gen_random_uuid()::text, 'SHOP_RECEIVE', 'Can confirm receipt of items', 'SHOP', NOW()),
  (gen_random_uuid()::text, 'SHOP_PROCESS', 'Can complete process control steps', 'SHOP', NOW()),
  (gen_random_uuid()::text, 'SHOP_SHIP', 'Can ship orders', 'SHOP', NOW()),
  (gen_random_uuid()::text, 'PROCESS_TEMPLATES_MANAGE', 'Can create/edit process templates', 'ADMIN', NOW())
ON CONFLICT ("code") DO NOTHING;

-- Link all to ADMIN role
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p.id, r.id
FROM "permissions" p, "roles" r
WHERE p."code" IN ('SHOP_RECEIVE', 'SHOP_PROCESS', 'SHOP_SHIP', 'PROCESS_TEMPLATES_MANAGE')
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
git commit -m "feat(shop): add process templates nav item and seed permissions"
```

---

## Verification

After all tasks complete:
- `npx vitest run` — all tests pass (306 existing + new shop tests)
- `npx next build` — build succeeds with no TypeScript errors
- Manual test: spin up dev server, navigate to /shop, /shop/[id], /admin/process-templates

## Key Files

- `prisma/schema.prisma` (modify — add OrderProcessStep, receivedAt)
- `src/lib/__mocks__/prisma.ts` (modify — add new model mocks)
- `src/lib/validations/shop.ts` (new)
- `src/lib/validations/shop.test.ts` (new)
- `src/lib/validations/process-template.ts` (new)
- `src/lib/validations/process-template.test.ts` (new)
- `src/lib/validations/order.ts` (modify — add "ready" action)
- `src/app/api/admin/process-templates/route.ts` (new)
- `src/app/api/admin/process-templates/[id]/route.ts` (new)
- `src/app/api/shop/orders/[id]/receive/route.ts` (new)
- `src/app/api/shop/orders/[id]/assign-template/route.ts` (new)
- `src/app/api/shop/orders/[id]/process/route.ts` (new)
- `src/app/api/shop/orders/[id]/ship/route.ts` (new)
- `src/app/api/orders/[id]/status/route.ts` (modify — add "ready")
- `src/app/(authenticated)/admin/process-templates/page.tsx` (new)
- `src/components/admin/process-template-list.tsx` (new)
- `src/components/admin/process-template-editor.tsx` (new)
- `src/app/(authenticated)/shop/page.tsx` (new)
- `src/components/shop/shop-order-list.tsx` (new)
- `src/app/(authenticated)/shop/[id]/page.tsx` (new)
- `src/components/shop/shop-order-header.tsx` (new)
- `src/components/shop/shop-receiving.tsx` (new)
- `src/components/shop/shop-process-control.tsx` (new)
- `src/components/nav-links.tsx` (modify)
- Test files for all new API routes (new)
