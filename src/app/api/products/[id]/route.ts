import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validations/product";
import type { ProductLibraryType } from "@/generated/prisma/client";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const result = productSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { libraryType, description, size, type, ...prices } = result.data;

  const p1 = prices.price1 ? parseFloat(prices.price1) : null;
  const p2 = prices.price2 ? parseFloat(prices.price2) : null;
  const p7 = prices.price7 ? parseFloat(prices.price7) : null;
  const p8 = prices.price8 ? parseFloat(prices.price8) : null;
  const p3 = libraryType === "FITTING" && p1 != null
    ? Math.round(p1 * 1.1 * 100) / 100
    : prices.price3 ? parseFloat(prices.price3) : null;

  const item = await prisma.productLibraryItem.update({
    where: { id },
    data: {
      libraryType: libraryType as ProductLibraryType,
      description,
      size: size || null,
      type: type || null,
      price1: p1,
      price2: p2,
      price3: p3,
      price7: p7,
      price8: p8,
    },
  });

  return NextResponse.json(item);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  if (typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const item = await prisma.productLibraryItem.update({
    where: { id },
    data: {
      isActive: body.isActive,
      ...(body.isActive ? {} : { deletedAt: new Date() }),
    },
  });

  return NextResponse.json(item);
}
