import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.id, "QA_MANAGE");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [coatingFailures, methodFailures] = await Promise.all([
    prisma.coatingFailure.findMany({ orderBy: { code: "asc" } }),
    prisma.methodFailure.findMany({ orderBy: { code: "asc" } }),
  ]);

  return NextResponse.json({ coatingFailures, methodFailures });
}
