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

  const allowed = await hasPermission(session.user.id, "tool_modify");
  if (!allowed) {
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
      orderId: result.data.orderId,
      assignment: result.data.assignment,
      toolId: id,
    },
  });

  return NextResponse.json(assignment, { status: 201 });
}
