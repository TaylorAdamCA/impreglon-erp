# Tool Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the tool management module with full CRUD, parts tracking, order assignments, and a receiving workflow.

**Architecture:** Extends existing Prisma schema with a new `ToolReceipt` model. API routes follow established patterns (auth check, permission check, validation, Prisma queries). Tools list + detail pages follow the same patterns as customers/invoices. Order detail page gets a new tools section.

**Tech Stack:** Next.js 16 App Router, Prisma 6, Zod validation, shadcn/ui, vitest

---

### Task 1: Schema Migration — Add ToolReceipt Model + Prisma Mock Updates

**Files:**
- Modify: `prisma/schema.prisma` (add ToolReceipt model, add receipts relation to Tool)
- Modify: `src/lib/__mocks__/prisma.ts` (add tool, toolPart, toolAssignment, toolReceipt mocks)

**Step 1: Add ToolReceipt model to schema**

In `prisma/schema.prisma`, add after the `ToolAssignment` model (around line 656):

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

And add `receipts ToolReceipt[]` to the `Tool` model (after the `assignments` line).

**Step 2: Run migration**

```bash
npx prisma migrate dev --name add_tool_receipts
```

**Step 3: Add mock models to prisma mock**

In `src/lib/__mocks__/prisma.ts`, add these to the export:

```typescript
tool: createModelMock(),
toolPart: createModelMock(),
toolAssignment: createModelMock(),
toolReceipt: createModelMock(),
```

**Step 4: Run tests to verify nothing broke**

```bash
npx vitest run
```
Expected: All 622 existing tests pass.

**Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/lib/__mocks__/prisma.ts
git commit -m "feat: add ToolReceipt model and update prisma mock for tools"
```

---

### Task 2: Validation Schemas

**Files:**
- Create: `src/lib/validations/tool.ts`
- Create: `src/lib/validations/tool.test.ts`

**Step 1: Write failing tests**

Create `src/lib/validations/tool.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  toolSchema,
  toolPartSchema,
  toolAssignmentSchema,
  toolReceiptSchema,
  toolStatusSchema,
} from "./tool";

describe("toolSchema", () => {
  it("accepts valid tool data", () => {
    const result = toolSchema.safeParse({
      description: "Ball Valve Mandrel",
      toolType: "Mandrel",
      price: 150.50,
      owner: "Suncor",
      location: "Shop Floor",
      isProprietary: true,
    });
    expect(result.success).toBe(true);
  });

  it("requires description", () => {
    const result = toolSchema.safeParse({ description: "" });
    expect(result.success).toBe(false);
  });

  it("accepts minimal data (description only)", () => {
    const result = toolSchema.safeParse({ description: "Simple Tool" });
    expect(result.success).toBe(true);
  });

  it("rejects negative price", () => {
    const result = toolSchema.safeParse({
      description: "Test",
      price: -10,
    });
    expect(result.success).toBe(false);
  });
});

describe("toolPartSchema", () => {
  it("accepts valid part data", () => {
    const result = toolPartSchema.safeParse({
      partNo: "P-001",
      description: "O-Ring seal",
      price: 5.25,
      quantity: 4,
    });
    expect(result.success).toBe(true);
  });

  it("requires partNo and description", () => {
    const result = toolPartSchema.safeParse({ partNo: "" });
    expect(result.success).toBe(false);
  });

  it("rejects zero quantity", () => {
    const result = toolPartSchema.safeParse({
      partNo: "P-001",
      description: "O-Ring",
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("toolAssignmentSchema", () => {
  it("accepts valid assignment", () => {
    const result = toolAssignmentSchema.safeParse({
      orderId: "order-1",
      assignment: "Primary coating tool",
    });
    expect(result.success).toBe(true);
  });

  it("requires orderId", () => {
    const result = toolAssignmentSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("toolReceiptSchema", () => {
  it("accepts valid receipt data", () => {
    const result = toolReceiptSchema.safeParse({
      condition: "Good",
      notes: "Received in original packaging",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty receipt (no condition or notes)", () => {
    const result = toolReceiptSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("toolStatusSchema", () => {
  it("accepts valid status", () => {
    const result = toolStatusSchema.safeParse({ status: "RECEIVED" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = toolStatusSchema.safeParse({ status: "INVALID" });
    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/validations/tool.test.ts
```
Expected: FAIL — module not found.

**Step 3: Write implementation**

Create `src/lib/validations/tool.ts`:

```typescript
import { z } from "zod";

export const TOOL_STATUSES = ["ACTIVE", "RECEIVED", "IN_USE", "RETIRED"] as const;

export const toolSchema = z.object({
  description: z.string().min(1, "Description is required").max(500),
  toolType: z.string().max(100).optional().or(z.literal("")),
  price: z.number().min(0, "Price cannot be negative").optional(),
  owner: z.string().max(200).optional().or(z.literal("")),
  location: z.string().max(200).optional().or(z.literal("")),
  isProprietary: z.boolean().optional(),
});

export type ToolFormValues = z.infer<typeof toolSchema>;

export const toolPartSchema = z.object({
  partNo: z.string().min(1, "Part number is required").max(100),
  description: z.string().min(1, "Description is required").max(500),
  price: z.number().min(0).optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1").optional().default(1),
});

export type ToolPartFormValues = z.infer<typeof toolPartSchema>;

export const toolAssignmentSchema = z.object({
  orderId: z.string().min(1, "Order is required"),
  assignment: z.string().max(500).optional().or(z.literal("")),
});

export type ToolAssignmentFormValues = z.infer<typeof toolAssignmentSchema>;

export const toolReceiptSchema = z.object({
  condition: z.string().max(200).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type ToolReceiptFormValues = z.infer<typeof toolReceiptSchema>;

export const toolStatusSchema = z.object({
  status: z.enum(TOOL_STATUSES),
});

export type ToolStatusFormValues = z.infer<typeof toolStatusSchema>;
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/validations/tool.test.ts
```
Expected: All 12 tests pass.

**Step 5: Commit**

```bash
git add src/lib/validations/tool.ts src/lib/validations/tool.test.ts
git commit -m "feat: add tool validation schemas with tests"
```

---

### Task 3: Tool List API — GET /api/tools

**Files:**
- Create: `src/app/api/tools/route.ts`
- Create: `src/app/api/tools/route.test.ts`

**Step 1: Write failing tests**

Create `src/app/api/tools/route.test.ts`:

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

import { GET, POST } from "./route";

function makeGetRequest(params = "") {
  return new NextRequest(
    new URL(`http://localhost:3000/api/tools${params ? "?" + params : ""}`)
  );
}

describe("GET /api/tools", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("returns 403 without tool_view permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it("returns paginated tool list", async () => {
    mockPrisma.tool.findMany.mockResolvedValueOnce([
      { id: "t1", toolNo: 1, description: "Mandrel" },
    ] as never);
    mockPrisma.tool.count.mockResolvedValueOnce(1);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("filters by status", async () => {
    mockPrisma.tool.findMany.mockResolvedValueOnce([]);
    mockPrisma.tool.count.mockResolvedValueOnce(0);

    await GET(makeGetRequest("status=ACTIVE"));

    expect(mockPrisma.tool.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "ACTIVE" }),
      })
    );
  });

  it("filters by proprietary", async () => {
    mockPrisma.tool.findMany.mockResolvedValueOnce([]);
    mockPrisma.tool.count.mockResolvedValueOnce(0);

    await GET(makeGetRequest("proprietary=true"));

    expect(mockPrisma.tool.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isProprietary: true }),
      })
    );
  });

  it("searches by description, toolNo, and owner", async () => {
    mockPrisma.tool.findMany.mockResolvedValueOnce([]);
    mockPrisma.tool.count.mockResolvedValueOnce(0);

    await GET(makeGetRequest("search=mandrel"));

    expect(mockPrisma.tool.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { description: { contains: "mandrel", mode: "insensitive" } },
            { owner: { contains: "mandrel", mode: "insensitive" } },
          ]),
        }),
      })
    );
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run src/app/api/tools/route.test.ts
```

**Step 3: Write implementation**

Create `src/app/api/tools/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { toolSchema } from "@/lib/validations/tool";
import type { ToolStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "tool_view"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") ?? undefined;
  const proprietary = searchParams.get("proprietary");
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50", 10);

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status as ToolStatus;
  }

  if (proprietary === "true") {
    where.isProprietary = true;
  } else if (proprietary === "false") {
    where.isProprietary = false;
  }

  if (search) {
    const searchConditions: Record<string, unknown>[] = [
      { description: { contains: search, mode: "insensitive" } },
      { owner: { contains: search, mode: "insensitive" } },
    ];
    if (!isNaN(Number(search))) {
      searchConditions.push({ toolNo: { equals: Number(search) } });
    }
    where.OR = searchConditions;
  }

  const [items, total] = await Promise.all([
    prisma.tool.findMany({
      where,
      orderBy: { toolNo: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tool.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "tool_create"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const result = toolSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const maxTool = await prisma.tool.findFirst({
    orderBy: { toolNo: "desc" },
    select: { toolNo: true },
  });
  const nextToolNo = (maxTool?.toolNo ?? 0) + 1;

  const tool = await prisma.tool.create({
    data: {
      toolNo: nextToolNo,
      description: result.data.description,
      toolType: result.data.toolType || null,
      price: result.data.price ?? null,
      owner: result.data.owner || null,
      location: result.data.location || null,
      isProprietary: result.data.isProprietary ?? false,
    },
  });

  return NextResponse.json(tool, { status: 201 });
}
```

**Step 4: Add POST tests to the test file**

Add to the same test file:

```typescript
describe("POST /api/tools", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  function makePostRequest(body: unknown) {
    return new NextRequest(new URL("http://localhost:3000/api/tools"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makePostRequest({ description: "Test" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 without tool_create permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    const res = await POST(makePostRequest({ description: "Test" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid data", async () => {
    const res = await POST(makePostRequest({ description: "" }));
    expect(res.status).toBe(400);
  });

  it("creates tool with auto-incremented toolNo", async () => {
    mockPrisma.tool.findFirst.mockResolvedValueOnce({ toolNo: 5 } as never);
    mockPrisma.tool.create.mockResolvedValueOnce({
      id: "t1",
      toolNo: 6,
      description: "New Mandrel",
    } as never);

    const res = await POST(
      makePostRequest({ description: "New Mandrel", isProprietary: true })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.toolNo).toBe(6);
  });

  it("starts at toolNo 1 when no tools exist", async () => {
    mockPrisma.tool.findFirst.mockResolvedValueOnce(null);
    mockPrisma.tool.create.mockResolvedValueOnce({
      id: "t1",
      toolNo: 1,
    } as never);

    const res = await POST(makePostRequest({ description: "First Tool" }));
    expect(res.status).toBe(201);

    expect(mockPrisma.tool.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ toolNo: 1 }),
      })
    );
  });
});
```

**Step 5: Run tests**

```bash
npx vitest run src/app/api/tools/route.test.ts
```
Expected: All 11 tests pass.

**Step 6: Commit**

```bash
git add src/app/api/tools/route.ts src/app/api/tools/route.test.ts
git commit -m "feat: add tool list and create API with tests"
```

---

### Task 4: Tool Detail API — GET/PUT/PATCH /api/tools/[id]

**Files:**
- Create: `src/app/api/tools/[id]/route.ts`
- Create: `src/app/api/tools/[id]/route.test.ts`

**Step 1: Write failing tests**

Create `src/app/api/tools/[id]/route.test.ts`:

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

import { GET, PUT, PATCH } from "./route";

const paramsPromise = Promise.resolve({ id: "tool-1" });

describe("GET /api/tools/[id]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = new NextRequest(new URL("http://localhost:3000/api/tools/tool-1"));
    const res = await GET(req, { params: paramsPromise });
    expect(res.status).toBe(401);
  });

  it("returns 404 when tool not found", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce(null);
    const req = new NextRequest(new URL("http://localhost:3000/api/tools/tool-1"));
    const res = await GET(req, { params: paramsPromise });
    expect(res.status).toBe(404);
  });

  it("returns tool with parts, assignments, and receipts", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce({
      id: "tool-1",
      toolNo: 1,
      description: "Mandrel",
      parts: [],
      assignments: [],
      receipts: [],
    } as never);

    const req = new NextRequest(new URL("http://localhost:3000/api/tools/tool-1"));
    const res = await GET(req, { params: paramsPromise });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("tool-1");
  });
});

describe("PUT /api/tools/[id]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 403 without tool_modify permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    const req = new NextRequest(new URL("http://localhost:3000/api/tools/tool-1"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "Updated" }),
    });
    const res = await PUT(req, { params: paramsPromise });
    expect(res.status).toBe(403);
  });

  it("updates tool details", async () => {
    mockPrisma.tool.update.mockResolvedValueOnce({
      id: "tool-1",
      description: "Updated Mandrel",
    } as never);

    const req = new NextRequest(new URL("http://localhost:3000/api/tools/tool-1"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "Updated Mandrel", toolType: "Mandrel" }),
    });
    const res = await PUT(req, { params: paramsPromise });
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid data", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/tools/tool-1"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "" }),
    });
    const res = await PUT(req, { params: paramsPromise });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/tools/[id]", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("changes tool status", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce({
      id: "tool-1",
      status: "ACTIVE",
    } as never);
    mockPrisma.tool.update.mockResolvedValueOnce({
      id: "tool-1",
      status: "IN_USE",
    } as never);

    const req = new NextRequest(new URL("http://localhost:3000/api/tools/tool-1"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "IN_USE" }),
    });
    const res = await PATCH(req, { params: paramsPromise });
    expect(res.status).toBe(200);
  });

  it("rejects status change on RETIRED tool", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce({
      id: "tool-1",
      status: "RETIRED",
    } as never);

    const req = new NextRequest(new URL("http://localhost:3000/api/tools/tool-1"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACTIVE" }),
    });
    const res = await PATCH(req, { params: paramsPromise });
    expect(res.status).toBe(400);
  });

  it("rejects invalid status value", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/tools/tool-1"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "BANANA" }),
    });
    const res = await PATCH(req, { params: paramsPromise });
    expect(res.status).toBe(400);
  });
});
```

**Step 2: Run tests to verify they fail**

**Step 3: Write implementation**

Create `src/app/api/tools/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { toolSchema, toolStatusSchema } from "@/lib/validations/tool";
import type { ToolStatus } from "@/generated/prisma/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "tool_view"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const tool = await prisma.tool.findUnique({
    where: { id },
    include: {
      parts: { orderBy: { partNo: "asc" } },
      assignments: {
        include: { order: { select: { id: true, orderNo: true, customer: { select: { company: true } } } } },
        orderBy: { createdAt: "desc" },
      },
      receipts: { orderBy: { receivedAt: "desc" } },
    },
  });

  if (!tool) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }

  return NextResponse.json(tool);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "tool_modify"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const result = toolSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const tool = await prisma.tool.update({
    where: { id },
    data: {
      description: result.data.description,
      toolType: result.data.toolType || null,
      price: result.data.price ?? null,
      owner: result.data.owner || null,
      location: result.data.location || null,
      isProprietary: result.data.isProprietary ?? false,
    },
  });

  return NextResponse.json(tool);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "tool_modify"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const result = toolStatusSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid status", issues: result.error.issues },
      { status: 400 }
    );
  }

  const existing = await prisma.tool.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }

  if (existing.status === "RETIRED") {
    return NextResponse.json(
      { error: "Cannot change status of a retired tool" },
      { status: 400 }
    );
  }

  const tool = await prisma.tool.update({
    where: { id },
    data: { status: result.data.status as ToolStatus },
  });

  return NextResponse.json(tool);
}
```

**Step 4: Run tests**

```bash
npx vitest run src/app/api/tools/[id]/route.test.ts
```
Expected: All 9 tests pass.

**Step 5: Commit**

```bash
git add src/app/api/tools/[id]/route.ts src/app/api/tools/[id]/route.test.ts
git commit -m "feat: add tool detail, update, and status change API with tests"
```

---

### Task 5: Tool Parts API — /api/tools/[id]/parts

**Files:**
- Create: `src/app/api/tools/[id]/parts/route.ts`
- Create: `src/app/api/tools/[id]/parts/[partId]/route.ts`
- Create: `src/app/api/tools/[id]/parts/route.test.ts`

**Step 1: Write failing tests**

Create `src/app/api/tools/[id]/parts/route.test.ts`:

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

import { GET, POST } from "./route";

const paramsPromise = Promise.resolve({ id: "tool-1" });

describe("GET /api/tools/[id]/parts", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = new NextRequest(new URL("http://localhost:3000/api/tools/tool-1/parts"));
    const res = await GET(req, { params: paramsPromise });
    expect(res.status).toBe(401);
  });

  it("returns parts for tool", async () => {
    mockPrisma.toolPart.findMany.mockResolvedValueOnce([
      { id: "p1", partNo: "P-001", description: "O-Ring" },
    ] as never);

    const req = new NextRequest(new URL("http://localhost:3000/api/tools/tool-1/parts"));
    const res = await GET(req, { params: paramsPromise });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });
});

describe("POST /api/tools/[id]/parts", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 403 without tool_modify permission", async () => {
    mockHasPermission.mockResolvedValueOnce(true); // tool_view
    mockHasPermission.mockResolvedValueOnce(false); // tool_modify
    const req = new NextRequest(new URL("http://localhost:3000/api/tools/tool-1/parts"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partNo: "P-001", description: "O-Ring" }),
    });
    const res = await POST(req, { params: paramsPromise });
    expect(res.status).toBe(403);
  });

  it("creates a part", async () => {
    mockPrisma.toolPart.create.mockResolvedValueOnce({
      id: "p1",
      partNo: "P-001",
      description: "O-Ring",
      toolId: "tool-1",
    } as never);

    const req = new NextRequest(new URL("http://localhost:3000/api/tools/tool-1/parts"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partNo: "P-001", description: "O-Ring", quantity: 2 }),
    });
    const res = await POST(req, { params: paramsPromise });
    expect(res.status).toBe(201);
  });

  it("returns 400 for invalid data", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/tools/tool-1/parts"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partNo: "" }),
    });
    const res = await POST(req, { params: paramsPromise });
    expect(res.status).toBe(400);
  });
});
```

**Step 2: Run tests to verify they fail**

**Step 3: Write implementation**

Create `src/app/api/tools/[id]/parts/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { toolPartSchema } from "@/lib/validations/tool";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "tool_view"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const parts = await prisma.toolPart.findMany({
    where: { toolId: id },
    orderBy: { partNo: "asc" },
  });

  return NextResponse.json(parts);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "tool_modify"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const result = toolPartSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const part = await prisma.toolPart.create({
    data: {
      toolId: id,
      partNo: result.data.partNo,
      description: result.data.description,
      price: result.data.price ?? null,
      quantity: result.data.quantity,
    },
  });

  return NextResponse.json(part, { status: 201 });
}
```

Create `src/app/api/tools/[id]/parts/[partId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { toolPartSchema } from "@/lib/validations/tool";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "tool_modify"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { partId } = await params;
  const body = await request.json();
  const result = toolPartSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const part = await prisma.toolPart.update({
    where: { id: partId },
    data: {
      partNo: result.data.partNo,
      description: result.data.description,
      price: result.data.price ?? null,
      quantity: result.data.quantity,
    },
  });

  return NextResponse.json(part);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ partId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "tool_modify"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { partId } = await params;

  await prisma.toolPart.delete({
    where: { id: partId },
  });

  return NextResponse.json({ success: true });
}
```

**Step 4: Run tests**

```bash
npx vitest run src/app/api/tools/[id]/parts/route.test.ts
```
Expected: All 5 tests pass.

**Step 5: Commit**

```bash
git add src/app/api/tools/[id]/parts/
git commit -m "feat: add tool parts CRUD API with tests"
```

---

### Task 6: Tool Assignments API — /api/tools/[id]/assignments

**Files:**
- Create: `src/app/api/tools/[id]/assignments/route.ts`
- Create: `src/app/api/tools/[id]/assignments/[assignmentId]/route.ts`
- Create: `src/app/api/tools/[id]/assignments/route.test.ts`

**Step 1: Write failing tests**

Create `src/app/api/tools/[id]/assignments/route.test.ts`:

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

import { POST } from "./route";

const paramsPromise = Promise.resolve({ id: "tool-1" });

describe("POST /api/tools/[id]/assignments", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = new NextRequest(
      new URL("http://localhost:3000/api/tools/tool-1/assignments"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "order-1" }),
      }
    );
    const res = await POST(req, { params: paramsPromise });
    expect(res.status).toBe(401);
  });

  it("returns 403 without tool_modify permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    const req = new NextRequest(
      new URL("http://localhost:3000/api/tools/tool-1/assignments"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "order-1" }),
      }
    );
    const res = await POST(req, { params: paramsPromise });
    expect(res.status).toBe(403);
  });

  it("creates an assignment", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce({
      id: "tool-1",
      status: "ACTIVE",
    } as never);
    mockPrisma.toolAssignment.create.mockResolvedValueOnce({
      id: "a1",
      toolId: "tool-1",
      orderId: "order-1",
      assignment: "Primary tool",
    } as never);

    const req = new NextRequest(
      new URL("http://localhost:3000/api/tools/tool-1/assignments"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "order-1", assignment: "Primary tool" }),
      }
    );
    const res = await POST(req, { params: paramsPromise });
    expect(res.status).toBe(201);
  });

  it("rejects assignment of retired tool", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce({
      id: "tool-1",
      status: "RETIRED",
    } as never);

    const req = new NextRequest(
      new URL("http://localhost:3000/api/tools/tool-1/assignments"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "order-1" }),
      }
    );
    const res = await POST(req, { params: paramsPromise });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing orderId", async () => {
    const req = new NextRequest(
      new URL("http://localhost:3000/api/tools/tool-1/assignments"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
    const res = await POST(req, { params: paramsPromise });
    expect(res.status).toBe(400);
  });
});
```

**Step 2: Run tests to verify they fail**

**Step 3: Write implementation**

Create `src/app/api/tools/[id]/assignments/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { toolAssignmentSchema } from "@/lib/validations/tool";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "tool_modify"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const result = toolAssignmentSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  // Check tool is not retired
  const tool = await prisma.tool.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!tool) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }

  if (tool.status === "RETIRED") {
    return NextResponse.json(
      { error: "Cannot assign a retired tool" },
      { status: 400 }
    );
  }

  const assignment = await prisma.toolAssignment.create({
    data: {
      toolId: id,
      orderId: result.data.orderId,
      assignment: result.data.assignment || null,
    },
  });

  return NextResponse.json(assignment, { status: 201 });
}
```

Create `src/app/api/tools/[id]/assignments/[assignmentId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "tool_modify"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { assignmentId } = await params;

  await prisma.toolAssignment.delete({
    where: { id: assignmentId },
  });

  return NextResponse.json({ success: true });
}
```

**Step 4: Run tests**

```bash
npx vitest run src/app/api/tools/[id]/assignments/route.test.ts
```
Expected: All 5 tests pass.

**Step 5: Commit**

```bash
git add src/app/api/tools/[id]/assignments/
git commit -m "feat: add tool assignment and removal API with tests"
```

---

### Task 7: Tool Receive API — POST /api/tools/[id]/receive

**Files:**
- Create: `src/app/api/tools/[id]/receive/route.ts`
- Create: `src/app/api/tools/[id]/receive/route.test.ts`

**Step 1: Write failing tests**

Create `src/app/api/tools/[id]/receive/route.test.ts`:

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

import { POST } from "./route";

const paramsPromise = Promise.resolve({ id: "tool-1" });

function makeRequest(body: unknown = {}) {
  return new NextRequest(
    new URL("http://localhost:3000/api/tools/tool-1/receive"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

describe("POST /api/tools/[id]/receive", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(401);
  });

  it("returns 403 without tool_receive permission", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    const res = await POST(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(403);
  });

  it("returns 404 when tool not found", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(404);
  });

  it("returns 400 when tool is retired", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce({
      id: "tool-1",
      status: "RETIRED",
    } as never);

    const res = await POST(makeRequest(), { params: paramsPromise });
    expect(res.status).toBe(400);
  });

  it("records receipt and updates tool status to RECEIVED", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce({
      id: "tool-1",
      status: "ACTIVE",
    } as never);
    mockPrisma.toolReceipt.create.mockResolvedValueOnce({
      id: "r1",
      toolId: "tool-1",
      receivedBy: "test-user-id",
      condition: "Good",
      notes: "Clean",
    } as never);
    mockPrisma.tool.update.mockResolvedValueOnce({
      id: "tool-1",
      status: "RECEIVED",
    } as never);

    const res = await POST(
      makeRequest({ condition: "Good", notes: "Clean" }),
      { params: paramsPromise }
    );
    expect(res.status).toBe(200);

    expect(mockPrisma.toolReceipt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        toolId: "tool-1",
        receivedBy: "test-user-id",
        condition: "Good",
        notes: "Clean",
      }),
    });

    expect(mockPrisma.tool.update).toHaveBeenCalledWith({
      where: { id: "tool-1" },
      data: { status: "RECEIVED" },
    });
  });

  it("records receipt with no condition or notes", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce({
      id: "tool-1",
      status: "ACTIVE",
    } as never);
    mockPrisma.toolReceipt.create.mockResolvedValueOnce({
      id: "r1",
      toolId: "tool-1",
      receivedBy: "test-user-id",
    } as never);
    mockPrisma.tool.update.mockResolvedValueOnce({
      id: "tool-1",
      status: "RECEIVED",
    } as never);

    const res = await POST(makeRequest({}), { params: paramsPromise });
    expect(res.status).toBe(200);
  });
});
```

**Step 2: Run tests to verify they fail**

**Step 3: Write implementation**

Create `src/app/api/tools/[id]/receive/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { toolReceiptSchema } from "@/lib/validations/tool";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "tool_receive"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const result = toolReceiptSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const tool = await prisma.tool.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!tool) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }

  if (tool.status === "RETIRED") {
    return NextResponse.json(
      { error: "Cannot receive a retired tool" },
      { status: 400 }
    );
  }

  const receipt = await prisma.toolReceipt.create({
    data: {
      toolId: id,
      receivedBy: session.user.id,
      condition: result.data.condition || null,
      notes: result.data.notes || null,
    },
  });

  await prisma.tool.update({
    where: { id },
    data: { status: "RECEIVED" },
  });

  return NextResponse.json(receipt);
}
```

**Step 4: Run tests**

```bash
npx vitest run src/app/api/tools/[id]/receive/route.test.ts
```
Expected: All 6 tests pass.

**Step 5: Commit**

```bash
git add src/app/api/tools/[id]/receive/
git commit -m "feat: add tool receiving API with tests"
```

---

### Task 8: Order Tools API — /api/orders/[id]/tools

**Files:**
- Create: `src/app/api/orders/[id]/tools/route.ts`
- Create: `src/app/api/orders/[id]/tools/route.test.ts`

**Step 1: Write failing tests**

Create `src/app/api/orders/[id]/tools/route.test.ts`:

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

import { GET, POST } from "./route";

const paramsPromise = Promise.resolve({ id: "order-1" });

describe("GET /api/orders/[id]/tools", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = new NextRequest(new URL("http://localhost:3000/api/orders/order-1/tools"));
    const res = await GET(req, { params: paramsPromise });
    expect(res.status).toBe(401);
  });

  it("returns tools assigned to order", async () => {
    mockPrisma.toolAssignment.findMany.mockResolvedValueOnce([
      {
        id: "a1",
        toolId: "tool-1",
        orderId: "order-1",
        assignment: "Primary",
        tool: { id: "tool-1", toolNo: 1, description: "Mandrel", status: "IN_USE" },
      },
    ] as never);

    const req = new NextRequest(new URL("http://localhost:3000/api/orders/order-1/tools"));
    const res = await GET(req, { params: paramsPromise });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });
});

describe("POST /api/orders/[id]/tools", () => {
  beforeEach(() => {
    mockHasPermission.mockResolvedValue(true);
  });

  it("assigns tool to order from order side", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce({
      id: "tool-1",
      status: "ACTIVE",
    } as never);
    mockPrisma.toolAssignment.create.mockResolvedValueOnce({
      id: "a1",
      toolId: "tool-1",
      orderId: "order-1",
    } as never);

    const req = new NextRequest(new URL("http://localhost:3000/api/orders/order-1/tools"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolId: "tool-1", assignment: "Coating tool" }),
    });
    const res = await POST(req, { params: paramsPromise });
    expect(res.status).toBe(201);
  });

  it("rejects assigning retired tool", async () => {
    mockPrisma.tool.findUnique.mockResolvedValueOnce({
      id: "tool-1",
      status: "RETIRED",
    } as never);

    const req = new NextRequest(new URL("http://localhost:3000/api/orders/order-1/tools"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolId: "tool-1" }),
    });
    const res = await POST(req, { params: paramsPromise });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing toolId", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/orders/order-1/tools"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: paramsPromise });
    expect(res.status).toBe(400);
  });
});
```

**Step 2: Run tests to verify they fail**

**Step 3: Write implementation**

Create `src/app/api/orders/[id]/tools/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { z } from "zod";

const orderToolAssignSchema = z.object({
  toolId: z.string().min(1, "Tool is required"),
  assignment: z.string().max(500).optional().or(z.literal("")),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const assignments = await prisma.toolAssignment.findMany({
    where: { orderId: id },
    include: {
      tool: {
        select: { id: true, toolNo: true, description: true, status: true, isProprietary: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assignments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(session.user.id, "tool_modify"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const result = orderToolAssignSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const tool = await prisma.tool.findUnique({
    where: { id: result.data.toolId },
    select: { status: true },
  });

  if (!tool) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }

  if (tool.status === "RETIRED") {
    return NextResponse.json(
      { error: "Cannot assign a retired tool" },
      { status: 400 }
    );
  }

  const assignment = await prisma.toolAssignment.create({
    data: {
      toolId: result.data.toolId,
      orderId: id,
      assignment: result.data.assignment || null,
    },
  });

  return NextResponse.json(assignment, { status: 201 });
}
```

**Step 4: Run tests**

```bash
npx vitest run src/app/api/orders/[id]/tools/route.test.ts
```
Expected: All 5 tests pass.

**Step 5: Commit**

```bash
git add src/app/api/orders/[id]/tools/
git commit -m "feat: add order tools API for assignment from order side"
```

---

### Task 9: Tool List Page

**Files:**
- Create: `src/app/(authenticated)/tools/page.tsx`
- Create: `src/components/tools/tool-list.tsx`

**Reference:** The invoice list page pattern at `src/app/(authenticated)/invoices/page.tsx` and `src/components/invoices/invoice-list.tsx`.

**Step 1: Create the server page**

Create `src/app/(authenticated)/tools/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { ToolList } from "@/components/tools/tool-list";

export default async function ToolsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const canView = await hasPermission(session.user.id, "tool_view");
  if (!canView) {
    redirect("/dashboard");
  }

  const canCreate = await hasPermission(session.user.id, "tool_create");

  const tools = await prisma.tool.findMany({
    orderBy: { toolNo: "asc" },
  });

  const serialized = tools.map((t) => ({
    id: t.id,
    toolNo: t.toolNo,
    description: t.description,
    toolType: t.toolType,
    status: t.status,
    price: t.price ? t.price.toString() : null,
    owner: t.owner,
    location: t.location,
    isProprietary: t.isProprietary,
  }));

  return <ToolList tools={serialized} canCreate={canCreate} />;
}
```

**Step 2: Create the client component**

Create `src/components/tools/tool-list.tsx`:

```typescript
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface ToolItem {
  id: string;
  toolNo: number;
  description: string;
  toolType: string | null;
  status: string;
  price: string | null;
  owner: string | null;
  location: string | null;
  isProprietary: boolean;
}

interface ToolListProps {
  tools: ToolItem[];
  canCreate: boolean;
}

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Received", value: "RECEIVED" },
  { label: "In Use", value: "IN_USE" },
  { label: "Retired", value: "RETIRED" },
];

const PROP_FILTERS = [
  { label: "All", value: "" },
  { label: "Proprietary", value: "true" },
  { label: "Standard", value: "false" },
];

function statusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return <Badge variant="outline" className="border-green-500 text-green-600">Active</Badge>;
    case "RECEIVED":
      return <Badge variant="outline" className="border-blue-500 text-blue-600">Received</Badge>;
    case "IN_USE":
      return <Badge variant="outline" className="border-orange-500 text-orange-600">In Use</Badge>;
    case "RETIRED":
      return <Badge variant="secondary">Retired</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function ToolList({ tools, canCreate }: ToolListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [propFilter, setPropFilter] = useState("");

  const filtered = useMemo(() => {
    return tools.filter((tool) => {
      if (statusFilter && tool.status !== statusFilter) return false;
      if (propFilter === "true" && !tool.isProprietary) return false;
      if (propFilter === "false" && tool.isProprietary) return false;

      if (search) {
        const term = search.toLowerCase();
        const matchesNo = String(tool.toolNo).includes(term);
        const matchesDesc = tool.description.toLowerCase().includes(term);
        const matchesOwner = tool.owner?.toLowerCase().includes(term) ?? false;
        if (!matchesNo && !matchesDesc && !matchesOwner) return false;
      }

      return true;
    });
  }, [tools, search, statusFilter, propFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tools</h1>
        {canCreate && (
          <Button onClick={() => router.push("/tools/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Tool
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by tool #, description, or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {PROP_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={propFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPropFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Tool #</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-28">Type</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-28">Owner</TableHead>
              <TableHead className="w-28">Location</TableHead>
              <TableHead className="w-20">Prop.</TableHead>
              <TableHead className="w-24 text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  {search || statusFilter || propFilter ? (
                    <div className="flex flex-col items-center gap-1">
                      <Search className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No tools found</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No tools in inventory.</p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((tool) => (
                <TableRow
                  key={tool.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/tools/${tool.id}`)}
                >
                  <TableCell className="font-mono font-medium">{tool.toolNo}</TableCell>
                  <TableCell>{tool.description}</TableCell>
                  <TableCell>{tool.toolType || "\u2014"}</TableCell>
                  <TableCell>{statusBadge(tool.status)}</TableCell>
                  <TableCell>{tool.owner || "\u2014"}</TableCell>
                  <TableCell>{tool.location || "\u2014"}</TableCell>
                  <TableCell>
                    {tool.isProprietary ? (
                      <Badge variant="outline" className="border-purple-500 text-purple-600">Yes</Badge>
                    ) : "\u2014"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {tool.price ? `$${Number(tool.price).toFixed(2)}` : "\u2014"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

**Step 3: Verify build**

```bash
npx next build
```
Expected: Build passes with `/tools` route visible.

**Step 4: Commit**

```bash
git add src/app/(authenticated)/tools/page.tsx src/components/tools/tool-list.tsx
git commit -m "feat: add tool list page with status and proprietary filters"
```

---

### Task 10: Tool Detail Page

**Files:**
- Create: `src/app/(authenticated)/tools/[id]/page.tsx`
- Create: `src/components/tools/tool-detail.tsx`

**Reference:** The invoice detail page pattern at `src/components/invoices/invoice-detail.tsx` — uses cards, tabs/sections, and permission-gated actions.

**Step 1: Create the server page**

Create `src/app/(authenticated)/tools/[id]/page.tsx`:

```typescript
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { ToolDetail } from "@/components/tools/tool-detail";

interface ToolDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ToolDetailPage({ params }: ToolDetailPageProps) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const canView = await hasPermission(session.user.id, "tool_view");
  if (!canView) {
    redirect("/dashboard");
  }

  const [canModify, canReceive] = await Promise.all([
    hasPermission(session.user.id, "tool_modify"),
    hasPermission(session.user.id, "tool_receive"),
  ]);

  const tool = await prisma.tool.findUnique({
    where: { id },
    include: {
      parts: { orderBy: { partNo: "asc" } },
      assignments: {
        include: {
          order: {
            select: { id: true, orderNo: true, customer: { select: { company: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      receipts: { orderBy: { receivedAt: "desc" } },
    },
  });

  if (!tool) {
    notFound();
  }

  const serialized = {
    id: tool.id,
    toolNo: tool.toolNo,
    description: tool.description,
    toolType: tool.toolType,
    status: tool.status,
    price: tool.price ? tool.price.toString() : null,
    owner: tool.owner,
    location: tool.location,
    isProprietary: tool.isProprietary,
    parts: tool.parts.map((p) => ({
      id: p.id,
      partNo: p.partNo,
      description: p.description,
      price: p.price ? p.price.toString() : null,
      quantity: p.quantity,
    })),
    assignments: tool.assignments.map((a) => ({
      id: a.id,
      assignment: a.assignment,
      createdAt: a.createdAt.toISOString(),
      order: {
        id: a.order.id,
        orderNo: a.order.orderNo,
        company: a.order.customer.company,
      },
    })),
    receipts: tool.receipts.map((r) => ({
      id: r.id,
      receivedBy: r.receivedBy,
      receivedAt: r.receivedAt.toISOString(),
      condition: r.condition,
      notes: r.notes,
    })),
  };

  return <ToolDetail tool={serialized} canModify={canModify} canReceive={canReceive} />;
}
```

**Step 2: Create the client component**

Create `src/components/tools/tool-detail.tsx`. This is a larger component (~350 lines) with:

- Header card showing tool info + edit form (if canModify)
- Parts section with add/edit/delete (if canModify)
- Assignments section with order links + assign/remove (if canModify)
- Receipts section with history + "Record Receipt" form (if canReceive)
- Status change controls (if canModify and not RETIRED)

The implementer should follow the invoice-detail.tsx pattern for structure: cards, `useRouter` + `router.refresh()` after mutations, `fetch()` calls to API routes, `useState` for forms.

Key UI patterns to follow:
- Use `Card`, `CardContent`, `CardHeader`, `CardTitle` from shadcn
- Use `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` from shadcn (install if not present)
- Status badge colors match the list page
- Price display: `$X.XX` with CAD formatting
- Empty states: em dash for null values
- Forms use controlled inputs with useState
- After each mutation: `router.refresh()` to reload server data

**Step 3: Verify build**

```bash
npx next build
```
Expected: Build passes with `/tools/[id]` route visible.

**Step 4: Commit**

```bash
git add src/app/(authenticated)/tools/[id]/page.tsx src/components/tools/tool-detail.tsx
git commit -m "feat: add tool detail page with parts, assignments, and receipts"
```

---

### Task 11: Order Detail — Add Tools Section

**Files:**
- Modify: `src/app/(authenticated)/orders/[id]/page.tsx` (add toolAssignments to query + pass to component)
- Create: `src/components/orders/order-tools.tsx`
- Modify: `src/app/(authenticated)/orders/[id]/page.tsx` (render OrderTools)

**Step 1: Update order detail page to include tool assignments**

In `src/app/(authenticated)/orders/[id]/page.tsx`:

1. Add `toolAssignments` to the Prisma include:
```typescript
toolAssignments: {
  include: {
    tool: { select: { id: true, toolNo: true, description: true, status: true, isProprietary: true } },
  },
  orderBy: { createdAt: "desc" },
},
```

2. Import and render `OrderTools` component after `OrderStatusHistory`:
```typescript
<OrderTools
  orderId={order.id}
  assignments={order.toolAssignments.map((a) => ({
    id: a.id,
    assignment: a.assignment,
    tool: {
      id: a.tool.id,
      toolNo: a.tool.toolNo,
      description: a.tool.description,
      status: a.tool.status,
      isProprietary: a.tool.isProprietary,
    },
  }))}
/>
```

**Step 2: Create OrderTools component**

Create `src/components/orders/order-tools.tsx`:

A simple component that:
- Shows a table of assigned tools (Tool #, Description, Status, Assignment notes)
- Tool # links to `/tools/[id]`
- Has "Assign Tool" button that calls POST `/api/orders/[id]/tools`
- Has "Remove" button per assignment that calls DELETE `/api/tools/[id]/assignments/[assignmentId]`
- Uses `useRouter` + `router.refresh()` after mutations

**Step 3: Verify build**

```bash
npx next build
```

**Step 4: Commit**

```bash
git add src/app/(authenticated)/orders/[id]/page.tsx src/components/orders/order-tools.tsx
git commit -m "feat: add tools section to order detail page"
```

---

### Task 12: Permission Seeding

**Files:**
- Modify: `prisma/seed.ts`

**Step 1: Add new permission codes**

In `prisma/seed.ts`, add these to the `permissionCodes` array (in the tools category, replacing or alongside the existing VFP codes):

```typescript
{ code: "tool_create", description: "Create tools", category: "tools" },
{ code: "tool_modify", description: "Modify tools and assignments", category: "tools" },
{ code: "tool_view", description: "View tools", category: "tools" },
{ code: "tool_receive", description: "Receive tools", category: "tools" },
```

**Step 2: Run all tests to verify nothing broke**

```bash
npx vitest run
```

**Step 3: Verify build**

```bash
npx next build
```

**Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: add tool management permission codes to seed data"
```
