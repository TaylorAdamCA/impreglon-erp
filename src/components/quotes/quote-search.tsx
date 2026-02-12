"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface QuoteSearchProps {
  defaultSearch: string;
  activeStatus: string;
}

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending", value: "PENDING_APPROVAL" },
  { label: "Approved", value: "APPROVED" },
];

export function QuoteSearch({
  defaultSearch,
  activeStatus,
}: QuoteSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(defaultSearch);

  const updateSearch = useCallback(
    (value: string, status?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      params.delete("page");

      const statusVal = status ?? activeStatus;
      if (statusVal) {
        params.set("status", statusVal);
      } else {
        params.delete("status");
      }

      startTransition(() => {
        router.push(`/quotes?${params.toString()}`);
      });
    },
    [router, searchParams, activeStatus]
  );

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by quote #, or customer..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            updateSearch(e.target.value);
          }}
          className={`pl-8 ${isPending ? "opacity-50" : ""}`}
        />
      </div>
      <div className="flex items-center gap-1">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            variant={activeStatus === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => updateSearch(search, filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
