import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { carrierSchema } from "@/lib/validations/customer";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; carrierId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, carrierId } = await params;
  const body = await request.json();
  const result = carrierSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  if (result.data.isDefault) {
    await prisma.carrier.updateMany({
      where: { customerId: id, isDefault: true, NOT: { id: carrierId } },
      data: { isDefault: false },
    });
  }

  const carrier = await prisma.carrier.update({
    where: { id: carrierId },
    data: result.data,
  });

  return NextResponse.json(carrier);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ carrierId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { carrierId } = await params;

  await prisma.carrier.delete({
    where: { id: carrierId },
  });

  return NextResponse.json({ success: true });
}
