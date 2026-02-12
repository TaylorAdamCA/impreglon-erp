import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations/customer";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, contactId } = await params;
  const body = await request.json();
  const result = contactSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  if (result.data.isPrimary) {
    await prisma.customerContact.updateMany({
      where: { customerId: id, isPrimary: true, NOT: { id: contactId } },
      data: { isPrimary: false },
    });
  }

  const contact = await prisma.customerContact.update({
    where: { id: contactId },
    data: result.data,
  });

  return NextResponse.json(contact);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contactId } = await params;

  await prisma.customerContact.delete({
    where: { id: contactId },
  });

  return NextResponse.json({ success: true });
}
