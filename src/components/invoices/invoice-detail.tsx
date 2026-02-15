"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface OrderDetail {
  id: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  coating: string | null;
}

interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedAt: string;
  changedBy: string;
  notes: string | null;
}

interface InvoiceOrder {
  id: string;
  orderNo: number;
  invoiceNo: number | null;
  invoiceDate: string | null;
  status: string;
  orderTotal: number;
  gstAmount: number;
  gstRate: number | null;
  invoiceNotes: string | null;
  invoiceDraftedBy: string | null;
  invoiceDraftedAt: string | null;
  invoiceModifiedAt: string | null;
  invoiceApprovedAt: string | null;
  invoiceFinalizedAt: string | null;
  poNumber: string | null;
  customer: { id: string; company: string; custNo: number };
  details: OrderDetail[];
  statusHistory: StatusHistoryEntry[];
}

interface InvoiceDetailProps {
  order: InvoiceOrder;
  permissions: string[];
  currentUserId: string;
}

function statusLabel(status: string) {
  switch (status) {
    case "DRAFT_INVOICE": return "Draft";
    case "INVOICE_MODIFIED": return "Modified";
    case "INVOICE_APPROVED": return "Approved";
    case "FINAL_INVOICE": return "Finalized";
    default: return status;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "DRAFT_INVOICE":
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Draft</Badge>;
    case "INVOICE_MODIFIED":
      return <Badge variant="outline" className="border-blue-500 text-blue-600">Modified</Badge>;
    case "INVOICE_APPROVED":
      return <Badge variant="outline" className="border-green-500 text-green-600">Approved</Badge>;
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

export function InvoiceDetail({
  order,
  permissions,
  currentUserId,
}: InvoiceDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState(order.invoiceNotes ?? "");
  const [gstOverride, setGstOverride] = useState<string>("");

  const canModify =
    permissions.includes("invoice_modify") &&
    ["DRAFT_INVOICE", "INVOICE_MODIFIED"].includes(order.status);
  const canApprove =
    permissions.includes("invoice_approve") &&
    ["DRAFT_INVOICE", "INVOICE_MODIFIED"].includes(order.status);
  const canFinalize =
    permissions.includes("invoice_finalize") &&
    order.status === "INVOICE_APPROVED";
  const isFinalized = order.status === "FINAL_INVOICE";
  const sameAsDrafter =
    canApprove && order.invoiceDraftedBy === currentUserId;

  async function handleModify() {
    setLoading(true);
    try {
      const body: Record<string, unknown> = { notes };
      if (gstOverride) body.gstOverride = parseFloat(gstOverride);

      const res = await fetch(`/api/invoices/${order.id}/modify`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to modify invoice");
        return;
      }

      toast.success("Invoice modified");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${order.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to approve invoice");
        return;
      }

      const data = await res.json();
      if (data.warning) toast.warning(data.warning);
      else toast.success("Invoice approved");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleFinalize() {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${order.id}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to finalize invoice");
        return;
      }

      toast.success("Invoice finalized");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/invoices")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">
              Invoice #{order.invoiceNo ?? "\u2014"}
            </h1>
            {statusBadge(order.status)}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Order #{order.orderNo} &middot; {order.customer.company} &middot;
            PO: {order.poNumber || "\u2014"}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Subtotal</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(order.orderTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              GST ({order.gstRate !== null ? `${order.gstRate}%` : "\u2014"})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(order.gstAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrency(order.orderTotal + order.gstAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Invoice Date</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {order.invoiceDate
                ? new Date(order.invoiceDate).toLocaleDateString("en-CA")
                : "\u2014"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-24">Coating</TableHead>
                <TableHead className="w-20 text-right">Qty</TableHead>
                <TableHead className="w-28 text-right">Unit Price</TableHead>
                <TableHead className="w-28 text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.details.map((detail) => (
                <TableRow key={detail.id}>
                  <TableCell>{detail.lineNumber}</TableCell>
                  <TableCell>{detail.description}</TableCell>
                  <TableCell>{detail.coating || "\u2014"}</TableCell>
                  <TableCell className="text-right">{detail.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(detail.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(detail.lineTotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modify section (only when editable) */}
      {canModify && (
        <Card>
          <CardHeader>
            <CardTitle>Modify Invoice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Invoice Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes..."
                rows={3}
              />
            </div>
            <div className="space-y-2 max-w-xs">
              <Label>GST Override (leave blank for auto-calculated)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={gstOverride}
                onChange={(e) => setGstOverride(e.target.value)}
                placeholder={String(order.gstAmount)}
              />
            </div>
            <Button onClick={handleModify} disabled={loading}>
              Save Changes
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notes (read-only when not modifiable) */}
      {!canModify && order.invoiceNotes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{order.invoiceNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {canApprove && (
          <>
            {sameAsDrafter && (
              <div className="flex items-center gap-2 text-sm text-yellow-600">
                <AlertTriangle className="h-4 w-4" />
                You drafted this invoice
              </div>
            )}
            <Button onClick={handleApprove} disabled={loading}>
              Approve Invoice
            </Button>
          </>
        )}

        {canFinalize && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={loading}>
                Finalize Invoice
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Finalize Invoice?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action is irreversible. Once finalized, the invoice
                  cannot be modified or reverted. Only finalize if the invoice
                  has been sent to the customer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleFinalize}>
                  Finalize
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {isFinalized && (
          <p className="text-sm text-muted-foreground">
            This invoice has been finalized and cannot be modified.
          </p>
        )}
      </div>

      {/* Status history */}
      <Card>
        <CardHeader>
          <CardTitle>Status History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.statusHistory.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    {new Date(entry.changedAt).toLocaleString("en-CA")}
                  </TableCell>
                  <TableCell>
                    {entry.fromStatus ? statusLabel(entry.fromStatus) : "\u2014"}
                  </TableCell>
                  <TableCell>{statusLabel(entry.toStatus)}</TableCell>
                  <TableCell>{entry.changedBy}</TableCell>
                  <TableCell>{entry.notes || "\u2014"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
