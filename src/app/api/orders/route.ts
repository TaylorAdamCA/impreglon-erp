import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOrderSchema } from "@/lib/validations/order";
import type { OrderStatus } from "@/generated/prisma/client";

const VALID_ORDER_STATUSES: string[] = [
  "PENDING",
  "IN_PROGRESS",
  "REWORK",
  "READY_TO_SHIP",
  "SHIPPED",
  "DRAFT_INVOICE",
  "INVOICE_APPROVED",
  "INVOICE_MODIFIED",
  "FINAL_INVOICE",
  "CLOSED",
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
    ...(status && VALID_ORDER_STATUSES.includes(status)
      ? { status: status as OrderStatus }
      : {}),
    ...(search
      ? {
          OR: [
            {
              customer: {
                company: { contains: search, mode: "insensitive" as const },
              },
            },
            {
              poNumber: { contains: search, mode: "insensitive" as const },
            },
            ...(isNaN(Number(search))
              ? []
              : [{ orderNo: { equals: Number(search) } }]),
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { company: true } },
        createdBy: { select: { username: true } },
      },
      orderBy: { orderDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ orders, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = createOrderSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const max = await prisma.order.findFirst({
    orderBy: { orderNo: "desc" },
    select: { orderNo: true },
  });
  const nextOrderNo = (max?.orderNo ?? 0) + 1;

  const order = await prisma.order.create({
    data: {
      customerId: result.data.customerId,
      orderNo: nextOrderNo,
      createdById: session.user.id,
      poNumber: result.data.poNumber || null,
      shipDate: result.data.shipDate ? new Date(result.data.shipDate) : null,
      dueDate: result.data.dueDate ? new Date(result.data.dueDate) : null,
      gstRate: result.data.gstRate,
      gstAmount: 0,
    },
  });

  await prisma.orderStatusHistory.create({
    data: {
      orderId: order.id,
      fromStatus: null,
      toStatus: "PENDING",
      changedById: session.user.id,
    },
  });

  return NextResponse.json(order, { status: 201 });
}
