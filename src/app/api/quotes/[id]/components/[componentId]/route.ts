import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { quoteComponentSchema } from "@/lib/validations/quote";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; componentId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, componentId } = await params;

  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (quote.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft quotes can be edited" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const result = quoteComponentSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { description, quantity, unitPrice } = result.data;
  const lineTotal = Math.round(quantity * unitPrice * 100) / 100;

  const component = await prisma.quoteComponent.update({
    where: { id: componentId },
    data: {
      description,
      quantity,
      unitPrice,
      lineTotal,
    },
  });

  // Recalculate quoteTotal
  const components = await prisma.quoteComponent.findMany({
    where: { quoteId: id },
    select: { lineTotal: true },
  });
  const quoteTotal = components.reduce(
    (sum, c) => sum + Number(c.lineTotal),
    0
  );
  await prisma.quote.update({
    where: { id },
    data: { quoteTotal },
  });

  return NextResponse.json(component);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; componentId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, componentId } = await params;

  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (quote.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft quotes can be edited" },
      { status: 400 }
    );
  }

  await prisma.quoteComponent.delete({ where: { id: componentId } });

  // Recalculate quoteTotal
  const components = await prisma.quoteComponent.findMany({
    where: { quoteId: id },
    select: { lineTotal: true },
  });
  const quoteTotal = components.reduce(
    (sum, c) => sum + Number(c.lineTotal),
    0
  );
  await prisma.quote.update({
    where: { id },
    data: { quoteTotal },
  });

  return new NextResponse(null, { status: 204 });
}
