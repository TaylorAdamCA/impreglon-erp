import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ProductFilters } from "@/components/products/product-filters";
import { ProductTable } from "@/components/products/product-table";
import { ProductAddButton } from "@/components/products/product-add-button";
import {
  LIBRARY_TYPES,
  LIBRARY_TYPE_LABELS,
  type LibraryType,
} from "@/lib/validations/product";
import type { ProductLibraryType } from "@/generated/prisma/client";

interface ProductsPageProps {
  searchParams: Promise<{
    type?: string;
    search?: string;
    page?: string;
    showInactive?: string;
  }>;
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const params = await searchParams;
  const libraryType = (
    LIBRARY_TYPES.includes(params.type as LibraryType)
      ? params.type
      : "VALVE"
  ) as LibraryType;
  const search = params.search ?? "";
  const page = parseInt(params.page ?? "1", 10);
  const pageSize = 50;
  const showInactive = params.showInactive === "true";

  const where = {
    libraryType: libraryType as ProductLibraryType,
    ...(showInactive ? {} : { isActive: true }),
    ...(search
      ? {
          OR: [
            { description: { contains: search, mode: "insensitive" as const } },
            ...(isNaN(Number(search))
              ? []
              : [{ libraryNo: { equals: Number(search) } }]),
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.productLibraryItem.findMany({
      where,
      orderBy: { libraryNo: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.productLibraryItem.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  // Serialize Decimal fields to strings for client components
  const serializedItems = items.map((item) => ({
    ...item,
    price1: item.price1?.toString() ?? null,
    price2: item.price2?.toString() ?? null,
    price3: item.price3?.toString() ?? null,
    price7: item.price7?.toString() ?? null,
    price8: item.price8?.toString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Product Libraries</h1>
          <p className="mt-1 text-muted-foreground">
            {LIBRARY_TYPE_LABELS[libraryType]} — {total} item
            {total !== 1 ? "s" : ""}
          </p>
        </div>
        <ProductAddButton libraryType={libraryType} />
      </div>

      <ProductFilters
        currentType={libraryType}
        defaultSearch={search}
        showInactive={showInactive}
      />

      <div className="rounded-md border">
        <ProductTable libraryType={libraryType} items={serializedItems} />
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
                    pathname: "/products",
                    query: {
                      type: libraryType,
                      ...(search ? { search } : {}),
                      ...(showInactive ? { showInactive: "true" } : {}),
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
                    pathname: "/products",
                    query: {
                      type: libraryType,
                      ...(search ? { search } : {}),
                      ...(showInactive ? { showInactive: "true" } : {}),
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
