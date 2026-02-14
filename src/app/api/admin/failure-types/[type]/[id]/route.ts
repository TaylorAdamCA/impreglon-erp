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
