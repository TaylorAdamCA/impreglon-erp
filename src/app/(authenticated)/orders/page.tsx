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
import { OrderSearch } from "@/components/orders/order-search";
import { CreateOrderDialog } from "@/components/orders/create-order-dialog";

const VALID_ORDER_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "REWORK",
  "READY_TO_SHIP",
  "SHIPPED",
  "DRAFT_INVOICE",
  "INVOICE_APPROVED",
  "INVOICE_MODIFIED",
  "FINAL_INVOICE",
  "CLOSED",
];

interface OrdersPageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  const status =
    params.status && VALID_ORDER_STATUSES.includes(params.status)
      ? params.status
      : "";
  const page = parseInt(params.page ?? "1", 10);
  const pageSize = 20;

  const where = {
    ...(status
      ? {
          status: status as
            | "PENDING"
            | "IN_PROGRESS"
            | "REWORK"
            | "READY_TO_SHIP"
            | "SHIPPED"
            | "DRAFT_INVOICE"
            | "INVOICE_APPROVED"
            | "INVOICE_MODIFIED"
            | "FINAL_INVOICE"
            | "CLOSED",
        }
      : {}),
    ...(search
      ? {
          OR: [
            {
              customer: {
                company: { contains: search, mode: "insensitive" as const },
              },
            },
            {
              poNumber: { contains: search, mode: "insensitive" as const },
            },
            ...(isNaN(Number(search))
              ? []
              : [{ orderNo: { equals: Number(search) } }]),
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { company: true } },
      },
      orderBy: { orderDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  function statusBadge(s: string) {
    switch (s) {
      case "PENDING":
        return <Badge variant="secondary">Pending</Badge>;
      case "IN_PROGRESS":
        return (
          <Badge
            variant="outline"
            className="border-yellow-500 text-yellow-600"
          >
            In Progress
          </Badge>
        );
      case "REWORK":
        return (
          <Badge variant="outline" className="border-red-500 text-red-600">
            Rework
          </Badge>
        );
      case "READY_TO_SHIP":
        return (
          <Badge
            variant="default"
            className="bg-green-600 hover:bg-green-700"
          >
            Ready to Ship
          </Badge>
        );
      case "SHIPPED":
        return <Badge variant="default">Shipped</Badge>;
      case "DRAFT_INVOICE":
        return <Badge variant="outline">Draft Invoice</Badge>;
      case "INVOICE_APPROVED":
        return <Badge variant="default">Invoice Approved</Badge>;
      case "INVOICE_MODIFIED":
        return (
          <Badge
            variant="outline"
            className="border-yellow-500 text-yellow-600"
          >
            Invoice Modified
          </Badge>
        );
      case "FINAL_INVOICE":
        return <Badge variant="default">Final Invoice</Badge>;
      case "CLOSED":
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="secondary">{s}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="mt-1 text-muted-foreground">
            {total} order{total !== 1 ? "s" : ""}
          </p>
        </div>
        <CreateOrderDialog />
      </div>

      <OrderSearch defaultSearch={search} activeStatus={status} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="w-28">PO #</TableHead>
              <TableHead className="w-28">Order Date</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-28 text-right">Total</TableHead>
              <TableHead className="w-24 text-right">GST</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {search || status ? (
                    <div className="flex flex-col items-center gap-1">
                      <Search className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No orders found
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No orders yet.</p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <ClickableRow key={o.id} href={`/orders/${o.id}`}>
                  <TableCell className="font-mono font-medium">
                    {o.orderNo}
                  </TableCell>
                  <TableCell>{o.customer.company}</TableCell>
                  <TableCell>{o.poNumber || "\u2014"}</TableCell>
                  <TableCell>
                    {new Date(o.orderDate).toLocaleDateString("en-CA")}
                  </TableCell>
                  <TableCell>{statusBadge(o.status)}</TableCell>
                  <TableCell className="text-right">
                    ${Number(o.orderTotal).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ${Number(o.gstAmount).toFixed(2)}
                  </TableCell>
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
                    pathname: "/orders",
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
                    pathname: "/orders",
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
