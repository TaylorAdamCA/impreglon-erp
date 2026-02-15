"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import Link from "next/link";
import { PERCENT_COMPLETE_VALUES } from "@/lib/validations/month-end";

interface Snapshot {
  id: string;
  orderId: string;
  orderNo: number;
  customerId: string;
  companyName: string;
  orderTotal: string;
  percentComplete: number;
  accrual: string;
}

interface PeriodDetailProps {
  snapshots: Snapshot[];
  year: number;
  month: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function PeriodDetail({ snapshots, year, month }: PeriodDetailProps) {
  const router = useRouter();
  const [rows, setRows] = useState(snapshots);
  const [deleting, setDeleting] = useState(false);

  function formatCurrency(amount: string | number) {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(Number(amount));
  }

  async function handlePercentChange(id: string, value: string) {
    try {
      const res = await fetch(`/api/month-end/${year}/${month}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percentComplete: Number(value) }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update percent complete");
        return;
      }

      setRows((prev) =>
        prev.map((row) => {
          if (row.id === id) {
            const newPercent = Number(value);
            const newAccrual = (Number(row.orderTotal) * newPercent / 100).toFixed(2);
            return {
              ...row,
              percentComplete: newPercent,
              accrual: newAccrual,
            };
          }
          return row;
        })
      );
    } catch {
      toast.error("Failed to update percent complete.");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/month-end/${year}/${month}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete period");
        return;
      }

      toast.success("Period deleted successfully.");
      router.push("/month-end");
    } catch {
      toast.error("Failed to delete period.");
    } finally {
      setDeleting(false);
    }
  }

  const totalOrders = rows.length;
  const totalValue = rows.reduce((sum, row) => sum + Number(row.orderTotal), 0);
  const totalAccruals = rows.reduce((sum, row) => sum + Number(row.accrual), 0);
  const avgPercent =
    rows.length > 0
      ? Math.round(
          rows.reduce((sum, row) => sum + row.percentComplete, 0) / rows.length
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/month-end"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Month End
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {MONTH_NAMES[month - 1]} {year}
            </h1>
            <p className="text-sm text-muted-foreground">
              Period detail and WIP accrual adjustments
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href={`/api/month-end/${year}/${month}/export`}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </a>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Period
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this period?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {totalOrders} snapshot records
                  for {MONTH_NAMES[month - 1]} {year}. This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "Deleting..." : "Delete Period"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Accruals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAccruals)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg % Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPercent}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Data table */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No snapshots in this period</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            There are no order snapshots for this period yet.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Order Total</TableHead>
                <TableHead>% Complete</TableHead>
                <TableHead className="text-right">Accrual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/orders/${row.orderId}`}
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      {row.orderNo}
                    </Link>
                  </TableCell>
                  <TableCell>{row.companyName}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.orderTotal)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={String(row.percentComplete)}
                      onValueChange={(value) => handlePercentChange(row.id, value)}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERCENT_COMPLETE_VALUES.map((pct) => (
                          <SelectItem key={pct} value={String(pct)}>
                            {pct}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.accrual)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
