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
