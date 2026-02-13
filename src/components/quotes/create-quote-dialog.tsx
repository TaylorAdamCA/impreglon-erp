"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function CreateQuoteDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, [search, fetchCustomers]);

  const handleCustomerClick = async (customerId: string) => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });

      if (res.ok) {
        const newQuote = await res.json();
        router.push("/quotes/" + newQuote.id);
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
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Quote
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Quote</DialogTitle>
        </DialogHeader>
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

          {isCreating && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Creating quote...
              </span>
            </div>
          )}

          {!isCreating && isSearching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isCreating && !isSearching && customers.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-md border">
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleCustomerClick(customer.id)}
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

          {!isCreating &&
            !isSearching &&
            search.trim() &&
            customers.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No customers found for &quot;{search}&quot;
              </p>
            )}

          {!isCreating && !search.trim() && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Type to search for a customer
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
