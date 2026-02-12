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
  const type = searchParams.get("type") ?? "VALVE";
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50", 10);
  const showInactive = searchParams.get("showInactive") === "true";

  if (!LIBRARY_TYPES.includes(type as (typeof LIBRARY_TYPES)[number])) {
    return NextResponse.json({ error: "Invalid library type" }, { status: 400 });
  }

  const where = {
    libraryType: type as ProductLibraryType,
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

  const [items, total] = await Promise.all([
    prisma.productLibraryItem.findMany({
      where,
      orderBy: { libraryNo: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.productLibraryItem.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
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

  const { libraryType, description, size, type, ...prices } = result.data;

  // Parse prices to numbers
  const p1 = prices.price1 ? parseFloat(prices.price1) : null;
  const p2 = prices.price2 ? parseFloat(prices.price2) : null;
  const p7 = prices.price7 ? parseFloat(prices.price7) : null;
  const p8 = prices.price8 ? parseFloat(prices.price8) : null;
  // Auto-calculate price3 for fittings
  const p3 = libraryType === "FITTING" && p1 != null
    ? Math.round(p1 * 1.1 * 100) / 100
    : prices.price3 ? parseFloat(prices.price3) : null;

  // Get the next libraryNo for this type
  const maxItem = await prisma.productLibraryItem.findFirst({
    where: { libraryType: libraryType as ProductLibraryType },
    orderBy: { libraryNo: "desc" },
    select: { libraryNo: true },
  });
  const nextLibraryNo = (maxItem?.libraryNo ?? 0) + 1;

  const item = await prisma.productLibraryItem.create({
    data: {
      libraryType: libraryType as ProductLibraryType,
      libraryNo: nextLibraryNo,
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

  return NextResponse.json(item, { status: 201 });
}
