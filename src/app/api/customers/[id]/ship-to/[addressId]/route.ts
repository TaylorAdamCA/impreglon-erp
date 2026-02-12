import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shipToSchema } from "@/lib/validations/customer";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; addressId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, addressId } = await params;
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
      where: { customerId: id, isDefault: true, NOT: { id: addressId } },
      data: { isDefault: false },
    });
  }

  const address = await prisma.shipToAddress.update({
    where: { id: addressId },
    data: result.data,
  });

  return NextResponse.json(address);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ addressId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { addressId } = await params;

  await prisma.shipToAddress.delete({
    where: { id: addressId },
  });

  return NextResponse.json({ success: true });
}
