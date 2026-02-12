import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productSchema, LIBRARY_TYPES } from "@/lib/validations/product";
import type { ProductLibraryType } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") ?? "ANSI_VALVE";
  const catalogSource = searchParams.get("catalogSource") ?? undefined;
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50", 10);
  const showInactive = searchParams.get("showInactive") === "true";

  if (!LIBRARY_TYPES.includes(type as (typeof LIBRARY_TYPES)[number])) {
    return NextResponse.json({ error: "Invalid library type" }, { status: 400 });
  }

  const where = {
    libraryType: type as ProductLibraryType,
    ...(catalogSource ? { catalogSource } : {}),
    ...(showInactive ? {} : { isActive: true }),
    ...(search
      ? {
          OR: [
            { description: { contains: search, mode: "insensitive" as const } },
            ...(isNaN(Number(search))
              ? []
              : [{ libraryNo: { equals: Number(search) } }]),
          ],
        }
      : {}),
  };

  const [items, total, labels] = await Promise.all([
    prisma.productLibraryItem.findMany({
      where,
      orderBy: { libraryNo: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.productLibraryItem.count({ where }),
    prisma.coatingPriceLabel.findMany({
      where: { libraryType: type as ProductLibraryType },
      orderBy: { slotNumber: "asc" },
    }),
  ]);

  return NextResponse.json({ items, total, page, pageSize, labels });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = productSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { libraryType, catalogSource, description, size, type } = result.data;

  const maxItem = await prisma.productLibraryItem.findFirst({
    where: {
      libraryType: libraryType as ProductLibraryType,
      ...(catalogSource ? { catalogSource } : {}),
    },
    orderBy: { libraryNo: "desc" },
    select: { libraryNo: true },
  });
  const nextLibraryNo = (maxItem?.libraryNo ?? 0) + 1;

  const item = await prisma.productLibraryItem.create({
    data: {
      libraryType: libraryType as ProductLibraryType,
      catalogSource: catalogSource || null,
      libraryNo: nextLibraryNo,
      description,
      size: size || null,
      type: type || null,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
