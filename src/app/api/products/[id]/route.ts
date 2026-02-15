import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validations/product";
import { calculateDrtMarkup, calculateFittingPrice3 } from "@/lib/pricing";
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

  const { libraryType, catalogSource, description, size, type } = result.data;

  const item = await prisma.productLibraryItem.update({
    where: { id },
    data: {
      libraryType: libraryType as ProductLibraryType,
      catalogSource: catalogSource || null,
      description,
      size: size || null,
      type: type || null,
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

  // Toggle active status
  if (typeof body.isActive === "boolean") {
    const item = await prisma.productLibraryItem.update({
      where: { id },
      data: {
        isActive: body.isActive,
        ...(body.isActive ? {} : { deletedAt: new Date() }),
      },
    });
    return NextResponse.json(item);
  }

  // Inline price update
  if (body.prices) {
    const data: Record<string, number | null> = {};
    const allowedFields = [
      "coatingPrice1", "coatingPrice2", "coatingPrice3", "coatingPrice4",
      "coatingPrice5", "coatingPrice6", "coatingPrice7", "coatingPrice8",
      "drtCostLower", "drtCostHigher",
    ];

    for (const [key, val] of Object.entries(body.prices)) {
      if (allowedFields.includes(key)) {
        data[key] = val === "" || val == null ? null : Number(val);
      }
    }

    // Auto-calculate DRT selling prices
    if (data.drtCostLower != null) {
      data.drtSellingLower = calculateDrtMarkup(data.drtCostLower);
    }
    if (data.drtCostHigher != null) {
      data.drtSellingHigher = calculateDrtMarkup(data.drtCostHigher);
    }

    // Auto-calculate fitting coatingPrice3 = coatingPrice1 × 1.1
    const existing = await prisma.productLibraryItem.findUnique({
      where: { id },
      select: { libraryType: true, coatingPrice1: true },
    });
    if (existing?.libraryType === "FITTING") {
      const cp1 = data.coatingPrice1 ?? (existing.coatingPrice1 ? Number(existing.coatingPrice1) : null);
      if (cp1 != null) {
        data.coatingPrice3 = calculateFittingPrice3(cp1);
      }
    }

    const item = await prisma.productLibraryItem.update({
      where: { id },
      data,
    });
    return NextResponse.json(item);
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
