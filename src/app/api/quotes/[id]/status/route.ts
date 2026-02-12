import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { quoteStatusSchema } from "@/lib/validations/quote";
import { hasPermission } from "@/lib/permissions";

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
  const result = quoteStatusSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 }
    );
  }

  const quote = await prisma.quote.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const { action } = result.data;

  if (action === "submit") {
    if (quote.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft quotes can be submitted" },
        { status: 400 }
      );
    }

    const componentCount = await prisma.quoteComponent.count({
      where: { quoteId: id },
    });

    if (componentCount === 0) {
      return NextResponse.json(
        { error: "Cannot submit a quote with no line items" },
        { status: 400 }
      );
    }

    const updated = await prisma.quote.update({
      where: { id },
      data: { status: "PENDING_APPROVAL" },
    });

    return NextResponse.json(updated);
  }

  if (action === "approve") {
    if (quote.status !== "PENDING_APPROVAL") {
      return NextResponse.json(
        { error: "Only pending quotes can be approved" },
        { status: 400 }
      );
    }

    const canApprove = await hasPermission(
      session.user.id,
      "QUOTES_APPROVE"
    );

    if (!canApprove) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const updated = await prisma.quote.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    return NextResponse.json(updated);
  }

  if (action === "reject") {
    if (quote.status !== "PENDING_APPROVAL") {
      return NextResponse.json(
        { error: "Only pending quotes can be rejected" },
        { status: 400 }
      );
    }

    const canApprove = await hasPermission(
      session.user.id,
      "QUOTES_APPROVE"
    );

    if (!canApprove) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const updated = await prisma.quote.update({
      where: { id },
      data: { status: "DRAFT" },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json(
    { error: "Validation failed" },
    { status: 400 }
  );
}
