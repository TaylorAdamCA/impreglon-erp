"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CustomerSearchProps {
  defaultSearch: string;
  showInactive: boolean;
}

export function CustomerSearch({
  defaultSearch,
  showInactive,
}: CustomerSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(defaultSearch);

  const updateSearch = useCallback(
    (value: string, inactive?: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      params.delete("page");

      const inactiveVal = inactive ?? showInactive;
      if (inactiveVal) {
        params.set("showInactive", "true");
      } else {
        params.delete("showInactive");
      }

      startTransition(() => {
        router.push(`/customers?${params.toString()}`);
      });
    },
    [router, searchParams, showInactive]
  );

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by company, city, or cust #..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            updateSearch(e.target.value);
          }}
          className={`pl-8 ${isPending ? "opacity-50" : ""}`}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showInactive"
          checked={showInactive}
          onChange={(e) => updateSearch(search, e.target.checked)}
          className="rounded border-input"
        />
        <Label htmlFor="showInactive" className="text-sm cursor-pointer">
          Show inactive
        </Label>
      </div>
    </div>
  );
}
