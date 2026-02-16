import Link from "next/link";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClickableRow } from "@/components/ui/clickable-row";
import { QuoteSearch } from "@/components/quotes/quote-search";
import { CreateQuoteDialog } from "@/components/quotes/create-quote-dialog";

const VALID_QUOTE_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SENT",
  "CONVERTED",
  "EXPIRED",
];

interface QuotesPageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  const status =
    params.status && VALID_QUOTE_STATUSES.includes(params.status)
      ? params.status
      : "";
  const page = parseInt(params.page ?? "1", 10);
  const pageSize = 20;

  const where = {
    ...(status ? { status: status as "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "SENT" | "CONVERTED" | "EXPIRED" } : {}),
    ...(search
      ? {
          OR: [
            {
              customer: {
                company: { contains: search, mode: "insensitive" as const },
              },
            },
            ...(isNaN(Number(search))
              ? []
              : [{ quoteNo: { equals: Number(search) } }]),
          ],
        }
      : {}),
  };

  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      include: {
        customer: { select: { company: true } },
        createdBy: { select: { username: true } },
      },
      orderBy: { quoteDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.quote.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quotes</h1>
          <p className="mt-1 text-muted-foreground">
            {total} quote{total !== 1 ? "s" : ""}
          </p>
        </div>
        <CreateQuoteDialog />
      </div>

      <QuoteSearch defaultSearch={search} activeStatus={status} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Quote #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="w-28">Date</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-28 text-right">Total</TableHead>
              <TableHead className="w-28">Created By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {search || status ? (
                    <div className="flex flex-col items-center gap-1">
                      <Search className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No quotes found
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No quotes yet.</p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              quotes.map((q) => (
                <ClickableRow key={q.id} href={`/quotes/${q.id}`}>
                  <TableCell className="font-mono font-medium">
                    {q.quoteNo}
                  </TableCell>
                  <TableCell>{q.customer.company}</TableCell>
                  <TableCell>
                    {new Date(q.quoteDate).toLocaleDateString("en-CA")}
                  </TableCell>
                  <TableCell>
                    {q.status === "DRAFT" && (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                    {q.status === "PENDING_APPROVAL" && (
                      <Badge
                        variant="outline"
                        className="border-yellow-500 text-yellow-600"
                      >
                        Pending
                      </Badge>
                    )}
                    {q.status === "APPROVED" && (
                      <Badge variant="default">Approved</Badge>
                    )}
                    {q.status === "SENT" && (
                      <Badge variant="outline">Sent</Badge>
                    )}
                    {q.status === "CONVERTED" && (
                      <Badge variant="default">Converted</Badge>
                    )}
                    {q.status === "EXPIRED" && (
                      <Badge variant="secondary">Expired</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    ${Number(q.quoteTotal).toFixed(2)}
                  </TableCell>
                  <TableCell>{q.createdBy.username}</TableCell>
                </ClickableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: "/quotes",
                    query: {
                      ...(search ? { search } : {}),
                      ...(status ? { status } : {}),
                      page: String(page - 1),
                    },
                  }}
                >
                  Previous
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: "/quotes",
                    query: {
                      ...(search ? { search } : {}),
                      ...(status ? { status } : {}),
                      page: String(page + 1),
                    },
                  }}
                >
                  Next
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
