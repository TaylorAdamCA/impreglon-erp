import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

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
        select: {
          id: true,
          toolNo: true,
          description: true,
          status: true,
          isProprietary: true,
        },
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

  const allowed = await hasPermission(session.user.id, "tool_modify");
  if (!allowed) {
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
      assignment: result.data.assignment,
      orderId: id,
    },
  });

  return NextResponse.json(assignment, { status: 201 });
}
