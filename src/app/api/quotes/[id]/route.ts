import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createQuoteSchema } from "@/lib/validations/quote";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: { select: { username: true } },
      components: { orderBy: { lineNumber: "asc" } },
    },
  });

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  return NextResponse.json(quote);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.quote.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft quotes can be edited" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const result = createQuoteSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const quote = await prisma.quote.update({
    where: { id },
    data: {
      customerId: result.data.customerId,
    },
  });

  return NextResponse.json(quote);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.quote.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft quotes can be deleted" },
      { status: 400 }
    );
  }

  await prisma.quote.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
