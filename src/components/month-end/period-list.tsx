"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Period {
  year: number;
  month: number;
  orderCount: number;
  totalOrderValue: number;
  totalAccruals: number;
}

interface PeriodListProps {
  periods: Period[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function PeriodList({ periods }: PeriodListProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);

  async function handleSeed() {
    setLoading(true);
    try {
      const res = await fetch(`/api/month-end/${selectedYear}/${selectedMonth}`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to seed period");
        return;
      }

      const data = await res.json();
      toast.success(`Period seeded — ${data.count} orders captured.`);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to seed period.");
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Month End Processing</h1>
            <p className="text-sm text-muted-foreground">WIP accrual snapshots by period</p>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Period
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Seed New Period</DialogTitle>
              <DialogDescription>
                Capture a snapshot of all in-progress orders for the selected month.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((name, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    min={2000}
                    max={2100}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSeed} disabled={loading}>
                {loading ? "Seeding..." : "Seed Period"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {periods.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No month-end periods processed yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Click &quot;New Period&quot; to capture your first WIP accrual snapshot.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right"># Orders</TableHead>
                <TableHead className="text-right">Total Order Value</TableHead>
                <TableHead className="text-right">Total Accruals</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map((period) => (
                <TableRow
                  key={`${period.year}-${period.month}`}
                  className="cursor-pointer"
                  onClick={() => router.push(`/month-end/${period.year}/${period.month}`)}
                >
                  <TableCell className="font-medium">
                    {MONTH_NAMES[period.month - 1]} {period.year}
                  </TableCell>
                  <TableCell className="text-right">{period.orderCount}</TableCell>
                  <TableCell className="text-right">{formatCurrency(period.totalOrderValue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(period.totalAccruals)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
