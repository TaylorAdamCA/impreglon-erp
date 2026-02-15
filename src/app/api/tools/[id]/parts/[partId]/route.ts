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

  const allowed = await hasPermission(session.user.id, "tool_modify");
  if (!allowed) {
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
    data: result.data,
  });

  return NextResponse.json(part);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "tool_modify");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { partId } = await params;

  await prisma.toolPart.delete({
    where: { id: partId },
  });

  return NextResponse.json({ success: true });
}
