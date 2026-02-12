import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shipToSchema } from "@/lib/validations/customer";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const result = shipToSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  if (result.data.isDefault) {
    await prisma.shipToAddress.updateMany({
      where: { customerId: id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const address = await prisma.shipToAddress.create({
    data: { ...result.data, customerId: id },
  });

  return NextResponse.json(address, { status: 201 });
}
