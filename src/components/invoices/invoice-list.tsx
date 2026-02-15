"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
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

interface Invoice {
  id: string;
  orderNo: number;
  invoiceNo: number | null;
  invoiceDate: string | null;
  customerName: string;
  status: string;
  orderTotal: number;
  gstAmount: number;
}

interface InvoiceListProps {
  invoices: Invoice[];
}

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT_INVOICE" },
  { label: "Modified", value: "INVOICE_MODIFIED" },
  { label: "Approved", value: "INVOICE_APPROVED" },
  { label: "Finalized", value: "FINAL_INVOICE" },
];

function statusBadge(status: string) {
  switch (status) {
    case "DRAFT_INVOICE":
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
          Draft
        </Badge>
      );
    case "INVOICE_MODIFIED":
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-600">
          Modified
        </Badge>
      );
    case "INVOICE_APPROVED":
      return (
        <Badge variant="outline" className="border-green-500 text-green-600">
          Approved
        </Badge>
      );
    case "FINAL_INVOICE":
      return <Badge variant="secondary">Finalized</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount);
}

export function InvoiceList({ invoices }: InvoiceListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter && inv.status !== statusFilter) return false;

      if (search) {
        const term = search.toLowerCase();
        const matchesInvoiceNo = inv.invoiceNo
          ? String(inv.invoiceNo).includes(term)
          : false;
        const matchesOrderNo = String(inv.orderNo).includes(term);
        const matchesCustomer = inv.customerName.toLowerCase().includes(term);

        if (!matchesInvoiceNo && !matchesOrderNo && !matchesCustomer)
          return false;
      }

      return true;
    });
  }, [invoices, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice #, order #, or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Invoice #</TableHead>
              <TableHead className="w-24">Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="w-28">Date</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-28 text-right">Subtotal</TableHead>
              <TableHead className="w-24 text-right">GST</TableHead>
              <TableHead className="w-28 text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  {search || statusFilter ? (
                    <div className="flex flex-col items-center gap-1">
                      <Search className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No invoices found
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No invoices yet.
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((inv) => (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/invoices/${inv.id}`)}
                >
                  <TableCell className="font-mono font-medium">
                    {inv.invoiceNo ?? "\u2014"}
                  </TableCell>
                  <TableCell className="font-mono">{inv.orderNo}</TableCell>
                  <TableCell>{inv.customerName}</TableCell>
                  <TableCell>
                    {inv.invoiceDate
                      ? new Date(inv.invoiceDate).toLocaleDateString("en-CA")
                      : "\u2014"}
                  </TableCell>
                  <TableCell>{statusBadge(inv.status)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(inv.orderTotal)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(inv.gstAmount)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(inv.orderTotal + inv.gstAmount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
