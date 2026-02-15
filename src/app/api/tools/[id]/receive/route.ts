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

  const allowed = await hasPermission(session.user.id, "tool_receive");
  if (!allowed) {
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
      condition: result.data.condition,
      notes: result.data.notes,
    },
  });

  await prisma.tool.update({
    where: { id },
    data: { status: "RECEIVED" },
  });

  return NextResponse.json(receipt, { status: 201 });
}
