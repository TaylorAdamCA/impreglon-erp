"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LIBRARY_TYPES,
  LIBRARY_TYPE_LABELS,
  HAS_CATALOG_SOURCE,
  CATALOG_SOURCES,
  type LibraryType,
} from "@/lib/validations/product";

interface ProductFiltersProps {
  currentType: LibraryType;
  currentCatalogSource?: string;
  defaultSearch: string;
  showInactive: boolean;
}

export function ProductFilters({
  currentType,
  currentCatalogSource,
  defaultSearch,
  showInactive,
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(defaultSearch);

  function navigate(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(overrides)) {
      if (val) {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    }
    params.delete("page");
    startTransition(() => {
      router.push(`/products?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-3">
      {/* Library type pills */}
      <div className="flex flex-wrap gap-1">
        {LIBRARY_TYPES.map((t) => (
          <button
            key={t}
            onClick={() =>
              navigate({
                type: t,
                search: undefined,
                catalogSource: undefined,
              })
            }
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              currentType === t
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            } ${isPending ? "opacity-50" : ""}`}
          >
            {LIBRARY_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Catalog source sub-selector for ANSI Valves */}
      {HAS_CATALOG_SOURCE[currentType] && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Catalog:</span>
          <div className="flex gap-1">
            <button
              onClick={() => navigate({ catalogSource: undefined })}
              className={`rounded px-2.5 py-0.5 text-xs font-medium transition-colors ${
                !currentCatalogSource
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              All
            </button>
            {CATALOG_SOURCES.map((s) => (
              <button
                key={s}
                onClick={() => navigate({ catalogSource: s })}
                className={`rounded px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  currentCatalogSource === s
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Catalog {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search and inactive toggle */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by description or lib #..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              navigate({ search: e.target.value || undefined });
            }}
            className={`pl-8 ${isPending ? "opacity-50" : ""}`}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showInactive"
            checked={showInactive}
            onChange={(e) =>
              navigate({
                showInactive: e.target.checked ? "true" : undefined,
              })
            }
            className="rounded border-input"
          />
          <Label htmlFor="showInactive" className="text-sm cursor-pointer">
            Show inactive
          </Label>
        </div>
      </div>
    </div>
  );
}
