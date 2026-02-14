import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

const INVOICE_STATUSES = [
  "DRAFT_INVOICE",
  "INVOICE_MODIFIED",
  "INVOICE_APPROVED",
  "FINAL_INVOICE",
];

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "invoice_view");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

  const where: Record<string, unknown> = {};

  if (status && INVOICE_STATUSES.includes(status)) {
    where.status = status;
  } else {
    where.status = { in: INVOICE_STATUSES };
  }

  if (search) {
    where.OR = [
      { customer: { company: { contains: search, mode: "insensitive" } } },
      ...(isNaN(Number(search))
        ? []
        : [
            { invoiceNo: { equals: Number(search) } },
            { orderNo: { equals: Number(search) } },
          ]),
    ];
  }

  const [invoices, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, company: true } },
      },
      orderBy: { invoiceDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ invoices, total, page, pageSize });
}
