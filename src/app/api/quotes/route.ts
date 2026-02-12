import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createQuoteSchema } from "@/lib/validations/quote";
import type { QuoteStatus } from "@/generated/prisma/client";

const VALID_QUOTE_STATUSES: string[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SENT",
  "CONVERTED",
  "EXPIRED",
];

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") ?? "";
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

  const where = {
    ...(status && VALID_QUOTE_STATUSES.includes(status)
      ? { status: status as QuoteStatus }
      : {}),
    ...(search
      ? {
          OR: [
            {
              customer: {
                company: { contains: search, mode: "insensitive" as const },
              },
            },
            ...(isNaN(Number(search))
              ? []
              : [{ quoteNo: { equals: Number(search) } }]),
          ],
        }
      : {}),
  };

  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      include: {
        customer: { select: { company: true } },
        createdBy: { select: { username: true } },
      },
      orderBy: { quoteDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.quote.count({ where }),
  ]);

  return NextResponse.json({ quotes, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = createQuoteSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const max = await prisma.quote.findFirst({
    orderBy: { quoteNo: "desc" },
    select: { quoteNo: true },
  });
  const nextQuoteNo = (max?.quoteNo ?? 0) + 1;

  const quote = await prisma.quote.create({
    data: {
      customerId: result.data.customerId,
      quoteNo: nextQuoteNo,
      createdById: session.user.id,
    },
  });

  return NextResponse.json(quote, { status: 201 });
}
