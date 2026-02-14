import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const dateParam = searchParams.get("date");

  if (dateParam) {
    const lookupDate = new Date(dateParam);

    const taxRate = await prisma.taxRate.findFirst({
      where: {
        taxId: "GST",
        effectiveDate: { lte: lookupDate },
        expiryDate: { gte: lookupDate },
      },
    });

    if (!taxRate) {
      return NextResponse.json(
        { error: "No tax rate found for the given date" },
        { status: 404 }
      );
    }

    return NextResponse.json(taxRate);
  }

  const taxRates = await prisma.taxRate.findMany({
    where: { taxId: "GST" },
    orderBy: { effectiveDate: "asc" },
  });

  return NextResponse.json(taxRates);
}
