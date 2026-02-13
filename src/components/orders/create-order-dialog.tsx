"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CustomerResult {
  id: string;
  company: string;
  city: string | null;
}

interface SelectedCustomer {
  id: string;
  company: string;
}

export function CreateOrderDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"search" | "details">("search");

  // Step 1: Customer search
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 2: Order details
  const [selectedCustomer, setSelectedCustomer] =
    useState<SelectedCustomer | null>(null);
  const [poNumber, setPoNumber] = useState("");
  const [shipDate, setShipDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [gstRate, setGstRate] = useState("5");
  const [isCreating, setIsCreating] = useState(false);

  const fetchCustomers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setCustomers([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/customers?search=${encodeURIComponent(query)}`
      );
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers ?? []);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (step !== "search") return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      fetchCustomers(search);
    }, 300);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [search, fetchCustomers, step]);

  const handleCustomerClick = (customer: CustomerResult) => {
    setSelectedCustomer({ id: customer.id, company: customer.company });
    setStep("details");
  };

  const handleBackToSearch = () => {
    setSelectedCustomer(null);
    setStep("search");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    setIsCreating(true);
    try {
      const body: Record<string, unknown> = {
        customerId: selectedCustomer.id,
        gstRate: parseFloat(gstRate) || 5,
      };
      if (poNumber.trim()) body.poNumber = poNumber.trim();
      if (shipDate) body.shipDate = new Date(shipDate).toISOString();
      if (dueDate) body.dueDate = new Date(dueDate).toISOString();

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const newOrder = await res.json();
        router.push("/orders/" + newOrder.id);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setSearch("");
      setCustomers([]);
      setSelectedCustomer(null);
      setStep("search");
      setPoNumber("");
      setShipDate("");
      setDueDate("");
      setGstRate("5");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
        </DialogHeader>

        {step === "search" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for a customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
                autoFocus
              />
            </div>

            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isSearching && customers.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-md border">
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleCustomerClick(customer)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">{customer.company}</span>
                    {customer.city && (
                      <span className="text-muted-foreground">
                        {customer.city}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!isSearching && search.trim() && customers.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No customers found for &quot;{search}&quot;
              </p>
            )}

            {!search.trim() && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Type to search for a customer
              </p>
            )}
          </div>
        )}

        {step === "details" && selectedCustomer && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium">{selectedCustomer.company}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBackToSearch}
              >
                <ArrowLeft className="mr-1 h-3 w-3" />
                Change
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="poNumber">PO Number</Label>
              <Input
                id="poNumber"
                placeholder="Enter PO number..."
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shipDate">Ship Date</Label>
                <Input
                  id="shipDate"
                  type="date"
                  value={shipDate}
                  onChange={(e) => setShipDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gstRate">GST Rate (%)</Label>
              <Input
                id="gstRate"
                type="number"
                step="0.01"
                min="0"
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isCreating}>
              {isCreating && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Order
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
