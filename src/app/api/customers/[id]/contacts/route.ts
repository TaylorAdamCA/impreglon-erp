import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations/customer";

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
  const result = contactSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  // If setting as primary, unset other primaries first
  if (result.data.isPrimary) {
    await prisma.customerContact.updateMany({
      where: { customerId: id, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const contact = await prisma.customerContact.create({
    data: { ...result.data, customerId: id },
  });

  return NextResponse.json(contact, { status: 201 });
}
