import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { quoteComponentSchema } from "@/lib/validations/quote";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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

  const { description, quantity, libraryType, libraryItemId, coatingSlot } =
    result.data;
  let { unitPrice } = result.data;

  // Auto-increment lineNumber
  const max = await prisma.quoteComponent.findFirst({
    where: { quoteId: id },
    orderBy: { lineNumber: "desc" },
    select: { lineNumber: true },
  });
  const lineNumber = (max?.lineNumber ?? 0) + 1;

  // Look up coating price from library item when coatingSlot provided
  if (libraryItemId && coatingSlot) {
    const product = await prisma.productLibraryItem.findUnique({
      where: { id: libraryItemId },
      select: {
        coatingPrice1: true,
        coatingPrice2: true,
        coatingPrice3: true,
        coatingPrice4: true,
        coatingPrice5: true,
        coatingPrice6: true,
        coatingPrice7: true,
        coatingPrice8: true,
      },
    });

    if (product) {
      const priceField = ("coatingPrice" + coatingSlot) as keyof typeof product;
      const price = product[priceField];
      if (price != null) {
        unitPrice = Number(price);
      }
    }
  }

  const lineTotal = Math.round(quantity * unitPrice * 100) / 100;

  const component = await prisma.quoteComponent.create({
    data: {
      quoteId: id,
      lineNumber,
      description,
      quantity,
      unitPrice,
      lineTotal,
      libraryType: libraryType || null,
      libraryItemId: libraryItemId || null,
    },
  });

  // Recalculate quoteTotal
  const components = await prisma.quoteComponent.findMany({
    where: { quoteId: id },
    select: { lineTotal: true },
  });
  const quoteTotal = components.reduce(
    (sum: number, c: { lineTotal: number }) => sum + Number(c.lineTotal),
    0
  );
  await prisma.quote.update({
    where: { id },
    data: { quoteTotal },
  });

  return NextResponse.json(component, { status: 201 });
}
