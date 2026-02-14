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
