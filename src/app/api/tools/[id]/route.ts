import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { toolSchema, toolStatusSchema } from "@/lib/validations/tool";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "tool_view");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

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

  const allowed = await hasPermission(session.user.id, "tool_modify");
  if (!allowed) {
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

  const allowed = await hasPermission(session.user.id, "tool_modify");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const body = await request.json();
  const result = toolStatusSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const existing = await prisma.tool.findUnique({ where: { id } });
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
    data: { status: result.data.status },
  });

  return NextResponse.json(tool);
}
