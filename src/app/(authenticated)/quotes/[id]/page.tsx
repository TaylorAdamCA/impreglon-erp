import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { QuoteHeader } from "@/components/quotes/quote-header";
import { QuoteDetail } from "@/components/quotes/quote-detail";

interface QuoteDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function QuoteDetailPage({
  params,
}: QuoteDetailPageProps) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) {
    notFound();
  }

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, company: true } },
      createdBy: { select: { username: true } },
      components: { orderBy: { lineNumber: "asc" } },
    },
  });

  if (!quote) {
    notFound();
  }

  const canApprove = await hasPermission(session.user.id, "QUOTES_APPROVE");

  return (
    <div className="space-y-6">
      <QuoteHeader
        quote={{
          id: quote.id,
          quoteNo: quote.quoteNo,
          quoteDate: quote.quoteDate.toISOString(),
          status: quote.status,
          quoteTotal: quote.quoteTotal.toString(),
          customer: quote.customer,
          createdBy: quote.createdBy,
        }}
        canApprove={canApprove}
      />

      <QuoteDetail
        quoteId={quote.id}
        components={quote.components.map((c) => ({
          id: c.id,
          lineNumber: c.lineNumber,
          description: c.description,
          libraryType: c.libraryType,
          quantity: c.quantity,
          unitPrice: c.unitPrice.toString(),
          lineTotal: c.lineTotal.toString(),
        }))}
        isDraft={quote.status === "DRAFT"}
      />
    </div>
  );
}
