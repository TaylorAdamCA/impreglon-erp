import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { toolSchema } from "@/lib/validations/tool";
import type { ToolStatus } from "@/generated/prisma/client";

const VALID_TOOL_STATUSES: string[] = ["ACTIVE", "RECEIVED", "IN_USE", "RETIRED"];

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "tool_view");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status");
  const proprietary = searchParams.get("proprietary");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

  const where: Record<string, unknown> = {};

  if (status && VALID_TOOL_STATUSES.includes(status)) {
    where.status = status as ToolStatus;
  }

  if (proprietary === "true") {
    where.isProprietary = true;
  } else if (proprietary === "false") {
    where.isProprietary = false;
  }

  if (search) {
    where.OR = [
      { description: { contains: search, mode: "insensitive" } },
      { owner: { contains: search, mode: "insensitive" } },
      ...(isNaN(Number(search))
        ? []
        : [{ toolNo: { equals: Number(search) } }]),
    ];
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

  const allowed = await hasPermission(session.user.id, "tool_create");
  if (!allowed) {
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

  const max = await prisma.tool.findFirst({
    orderBy: { toolNo: "desc" },
    select: { toolNo: true },
  });
  const nextToolNo = (max?.toolNo ?? 0) + 1;

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
