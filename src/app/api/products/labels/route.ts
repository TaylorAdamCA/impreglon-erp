import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { coatingPriceLabelSchema } from "@/lib/validations/product";
import type { ProductLibraryType } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = coatingPriceLabelSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const label = await prisma.coatingPriceLabel.upsert({
    where: {
      libraryType_slotNumber: {
        libraryType: result.data.libraryType as ProductLibraryType,
        slotNumber: result.data.slotNumber,
      },
    },
    update: {
      coatingName: result.data.coatingName,
      areaSpec: result.data.areaSpec,
    },
    create: {
      libraryType: result.data.libraryType as ProductLibraryType,
      slotNumber: result.data.slotNumber,
      coatingName: result.data.coatingName,
      areaSpec: result.data.areaSpec,
    },
  });

  return NextResponse.json(label);
}
