import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validations/customer";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);
  const showInactive = searchParams.get("showInactive") === "true";

  const where = {
    ...(showInactive ? {} : { isActive: true }),
    ...(search
      ? {
          OR: [
            { company: { contains: search, mode: "insensitive" as const } },
            { city: { contains: search, mode: "insensitive" as const } },
            ...(isNaN(Number(search))
              ? []
              : [{ custNo: { equals: Number(search) } }]),
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { company: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        custNo: true,
        company: true,
        city: true,
        province: true,
        phone: true,
        email: true,
        isActive: true,
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({ customers, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = customerSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const customer = await prisma.customer.create({
    data: result.data,
  });

  return NextResponse.json(customer, { status: 201 });
}
